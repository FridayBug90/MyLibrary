import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { Bluray, BlurayInput, Book, BookInput, LibraryStats, DirectorStats, AuthorStats } from '../types';

const DB_NAME = 'my_library_db';

const CREATE_BLURAYS = `
  CREATE TABLE IF NOT EXISTS blurays (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    title          TEXT    NOT NULL,
    original_title TEXT,
    director       TEXT,
    genre          TEXT,
    saga           TEXT,
    volume         INTEGER,
    steelbook      INTEGER NOT NULL DEFAULT 0,
    watched        INTEGER NOT NULL DEFAULT 0,
    animated       INTEGER NOT NULL DEFAULT 0,
    status         TEXT    NOT NULL DEFAULT 'owned' CHECK(status IN ('owned','wishlist')),
    rating         INTEGER,
    notes          TEXT,
    barcode        TEXT,
    cover_img      TEXT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`;

// Used only during migration (no IF NOT EXISTS — table was just renamed)
const MIGRATE_BLURAYS = `
  CREATE TABLE blurays (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    director    TEXT,
    genre       TEXT,
    saga        TEXT,
    volume      INTEGER,
    steelbook   INTEGER NOT NULL DEFAULT 0,
    watched     INTEGER NOT NULL DEFAULT 0,
    animated    INTEGER NOT NULL DEFAULT 0,
    status      TEXT    NOT NULL DEFAULT 'owned' CHECK(status IN ('owned','wishlist')),
    rating      INTEGER,
    notes       TEXT,
    barcode     TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`;

const CREATE_BOOKS = `
  CREATE TABLE IF NOT EXISTS books (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    title          TEXT    NOT NULL,
    original_title TEXT,
    author         TEXT,
    genre          TEXT,
    isbn           TEXT,
    saga           TEXT,
    volume         INTEGER,
    read           INTEGER NOT NULL DEFAULT 0,
    status         TEXT    NOT NULL DEFAULT 'owned' CHECK(status IN ('owned','wishlist')),
    rating         INTEGER,
    notes          TEXT,
    cover_img      TEXT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`;

// MIGRATE_BOOKS keeps CHECK with 'read' so migration from old data doesn't fail;
// migrateBookReadStatus() converts those rows afterwards.
const MIGRATE_BOOKS = `
  CREATE TABLE books (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    author      TEXT,
    genre       TEXT,
    isbn        TEXT,
    saga        TEXT,
    volume      INTEGER,
    read        INTEGER NOT NULL DEFAULT 0,
    status      TEXT    NOT NULL DEFAULT 'owned' CHECK(status IN ('owned','wishlist','read')),
    rating      INTEGER,
    notes       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  )`;

const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_blurays_title  ON blurays(title);`,
  `CREATE INDEX IF NOT EXISTS idx_blurays_status ON blurays(status);`,
  `CREATE INDEX IF NOT EXISTS idx_books_title    ON books(title);`,
  `CREATE INDEX IF NOT EXISTS idx_books_status   ON books(status);`,
];

class DatabaseService {
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private static instance: DatabaseService;

  private constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async initialize(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      await this.sqlite.initWebStore();
    }

    const ret = await this.sqlite.checkConnectionsConsistency();
    const isConn = (await this.sqlite.isConnection(DB_NAME, false)).result;

    if (ret.result && isConn) {
      this.db = await this.sqlite.retrieveConnection(DB_NAME, false);
    } else {
      this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
    }

    await this.db.open();
    await this.db.execute(CREATE_BLURAYS);
    await this.db.execute(CREATE_BOOKS);
    for (const idx of CREATE_INDEXES) {
      await this.db.execute(idx);
    }
    // Migrations: add columns to existing installations
    await this.addColumnIfMissing('blurays', 'steelbook', 'INTEGER NOT NULL DEFAULT 0');
    await this.addColumnIfMissing('blurays', 'watched',   'INTEGER NOT NULL DEFAULT 0');
    await this.addColumnIfMissing('blurays', 'animated',      'INTEGER NOT NULL DEFAULT 0');
    await this.addColumnIfMissing('blurays', 'saga',           'TEXT');
    await this.addColumnIfMissing('blurays', 'volume',         'INTEGER');
    await this.addColumnIfMissing('blurays', 'original_title', 'TEXT');
    await this.addColumnIfMissing('blurays', 'cover_img',      'TEXT');
    await this.addColumnIfMissing('books',   'saga',           'TEXT');
    await this.addColumnIfMissing('books',   'volume',         'INTEGER');
    await this.addColumnIfMissing('books',   'original_title', 'TEXT');
    await this.addColumnIfMissing('books',   'read',           'INTEGER NOT NULL DEFAULT 0');
    await this.addColumnIfMissing('books',   'cover_img',      'TEXT');
    // Migration: remove CHECK(rating BETWEEN 1 AND 5) constraint — upgrade to 1-10 scale
    await this.migrateRatingConstraint('blurays', MIGRATE_BLURAYS);
    await this.migrateRatingConstraint('books',   MIGRATE_BOOKS);
    // Migration: promote 'Animazione' genre tag to animated boolean flag
    await this.migrateAnimatedFromGenre();
    // Migration: convert status='read' rows to read=1, status='owned'
    await this.migrateBookReadStatus();
  }

  private async migrateRatingConstraint(table: string, migrationSql: string): Promise<void> {
    const res = await this.db!.query(
      `SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}';`
    );
    const schemaSql = ((res.values ?? [])[0]?.['sql'] as string | undefined) ?? '';
    if (!schemaSql.includes('BETWEEN 1 AND 5')) return;
    const tmp = `${table}_migration_temp`;
    await this.db!.execute(`DROP TABLE IF EXISTS ${tmp};`);
    await this.db!.execute(`ALTER TABLE ${table} RENAME TO ${tmp};`);
    await this.db!.execute(migrationSql);
    await this.db!.execute(`INSERT INTO ${table} SELECT * FROM ${tmp};`);
    await this.db!.execute(`DROP TABLE ${tmp};`);
  }

  private async migrateAnimatedFromGenre(): Promise<void> {
    // Set animated=1 for rows that still have 'Animazione' in genre (idempotent)
    await this.db!.execute(`
      UPDATE blurays SET animated = 1
      WHERE genre LIKE '%Animazione%' AND animated = 0;
    `);
    // Strip 'Animazione' from genre field (handles all positions: only, first, last, middle)
    await this.db!.execute(`
      UPDATE blurays SET genre =
        NULLIF(TRIM(
          TRIM(
            REPLACE(
              REPLACE(
                REPLACE(genre, ', Animazione, ', ', '),
                'Animazione, ', ''
              ),
              ', Animazione', ''
            )
          )
        ), '')
      WHERE genre LIKE '%Animazione%';
    `);
    await this.saveIfWeb();
  }

  private async migrateBookReadStatus(): Promise<void> {
    await this.db!.execute(`UPDATE books SET read=1, status='owned' WHERE status='read';`);
    await this.saveIfWeb();
  }

  private async addColumnIfMissing(table: string, column: string, definition: string): Promise<void> {
    const res = await this.db!.query(`PRAGMA table_info(${table});`);
    const cols = (res.values ?? []).map(r => r['name'] as string);
    if (!cols.includes(column)) {
      await this.db!.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
    }
  }

  // ---- Private: persist to IndexedDB on web ----
  private async saveIfWeb(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      await this.sqlite.saveToStore(DB_NAME);
    }
  }

  // ---- Blu-ray CRUD ----

  async getAllBlurays(): Promise<Bluray[]> {
    const res = await this.db!.query(
      'SELECT id, title, original_title, director, genre, saga, volume, steelbook, watched, animated, status, rating, notes, barcode, cover_img, created_at FROM blurays ORDER BY title ASC;'
    );
    return (res.values ?? []).map(this.rowToBluray);
  }

  async searchBlurays(query: string): Promise<Bluray[]> {
    const q = `%${query}%`;
    const res = await this.db!.query(
      'SELECT id, title, original_title, director, genre, saga, volume, steelbook, watched, animated, status, rating, notes, barcode, cover_img, created_at FROM blurays WHERE title LIKE ? OR director LIKE ? ORDER BY title ASC;',
      [q, q]
    );
    return (res.values ?? []).map(this.rowToBluray);
  }

  async addBluray(data: BlurayInput): Promise<number> {
    const res = await this.db!.run(
      `INSERT INTO blurays (title, original_title, director, genre, saga, volume, steelbook, watched, animated, status, rating, notes, barcode, cover_img)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [data.title, data.original_title, data.director, data.genre, data.saga, data.volume, data.steelbook ? 1 : 0, data.watched ? 1 : 0, data.animated ? 1 : 0, data.status, data.rating, data.notes, data.barcode, data.cover_img]
    );
    await this.saveIfWeb();
    return res.changes?.lastId ?? 0;
  }

  async updateBluray(id: number, data: BlurayInput): Promise<void> {
    await this.db!.run(
      `UPDATE blurays SET title=?, original_title=?, director=?, genre=?, saga=?, volume=?, steelbook=?, watched=?, animated=?, status=?, rating=?, notes=?, barcode=?, cover_img=? WHERE id=?;`,
      [data.title, data.original_title, data.director, data.genre, data.saga, data.volume, data.steelbook ? 1 : 0, data.watched ? 1 : 0, data.animated ? 1 : 0, data.status, data.rating, data.notes, data.barcode, data.cover_img, id]
    );
    await this.saveIfWeb();
  }

  async deleteBluray(id: number): Promise<void> {
    await this.db!.run('DELETE FROM blurays WHERE id=?;', [id]);
    await this.saveIfWeb();
  }

  // ---- Book CRUD ----

  async getAllBooks(): Promise<Book[]> {
    const res = await this.db!.query(
      'SELECT id, title, original_title, author, genre, isbn, saga, volume, read, status, rating, notes, cover_img, created_at FROM books ORDER BY title ASC;'
    );
    return (res.values ?? []).map(this.rowToBook);
  }

  async searchBooks(query: string): Promise<Book[]> {
    const q = `%${query}%`;
    const res = await this.db!.query(
      'SELECT id, title, original_title, author, genre, isbn, saga, volume, read, status, rating, notes, cover_img, created_at FROM books WHERE title LIKE ? OR author LIKE ? ORDER BY title ASC;',
      [q, q]
    );
    return (res.values ?? []).map(this.rowToBook);
  }

  async addBook(data: BookInput): Promise<number> {
    const res = await this.db!.run(
      `INSERT INTO books (title, original_title, author, genre, isbn, saga, volume, read, status, rating, notes, cover_img)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [data.title, data.original_title, data.author, data.genre, data.isbn, data.saga, data.volume, data.read ? 1 : 0, data.status, data.rating, data.notes, data.cover_img]
    );
    await this.saveIfWeb();
    return res.changes?.lastId ?? 0;
  }

  async updateBook(id: number, data: BookInput): Promise<void> {
    await this.db!.run(
      `UPDATE books SET title=?, original_title=?, author=?, genre=?, isbn=?, saga=?, volume=?, read=?, status=?, rating=?, notes=?, cover_img=? WHERE id=?;`,
      [data.title, data.original_title, data.author, data.genre, data.isbn, data.saga, data.volume, data.read ? 1 : 0, data.status, data.rating, data.notes, data.cover_img, id]
    );
    await this.saveIfWeb();
  }

  async deleteBook(id: number): Promise<void> {
    await this.db!.run('DELETE FROM books WHERE id=?;', [id]);
    await this.saveIfWeb();
  }

  // ---- Suggestions ----

  async getDistinctDirectors(): Promise<string[]> {
    const res = await this.db!.query(
      `SELECT director FROM blurays WHERE director IS NOT NULL AND director != '';`
    );
    const raw = (res.values ?? []).map(r => r['director'] as string);
    const all = raw.flatMap(d => d.split(', ').map(s => s.trim())).filter(Boolean);
    return [...new Set(all)].sort();
  }

  async getDistinctAuthors(): Promise<string[]> {
    const res = await this.db!.query(
      `SELECT author FROM books WHERE author IS NOT NULL AND author != '';`
    );
    const raw = (res.values ?? []).map(r => r['author'] as string);
    const all = raw.flatMap(a => a.split(', ').map(s => s.trim())).filter(Boolean);
    return [...new Set(all)].sort();
  }

  async getDistinctBluraySagas(): Promise<string[]> {
    const res = await this.db!.query(
      `SELECT DISTINCT saga FROM blurays WHERE saga IS NOT NULL AND saga != '' ORDER BY saga ASC;`
    );
    return (res.values ?? []).map(r => r['saga'] as string);
  }

  async getDistinctBookSagas(): Promise<string[]> {
    const res = await this.db!.query(
      `SELECT DISTINCT saga FROM books WHERE saga IS NOT NULL AND saga != '' ORDER BY saga ASC;`
    );
    return (res.values ?? []).map(r => r['saga'] as string);
  }

  // ---- Duplicate checks ----

  async findBlurayByBarcode(barcode: string, excludeId?: number): Promise<Bluray | null> {
    const sql = excludeId
      ? 'SELECT id, title, original_title, director, genre, saga, volume, steelbook, watched, animated, status, rating, notes, barcode, cover_img, created_at FROM blurays WHERE barcode = ? AND id != ? LIMIT 1;'
      : 'SELECT id, title, original_title, director, genre, saga, volume, steelbook, watched, animated, status, rating, notes, barcode, cover_img, created_at FROM blurays WHERE barcode = ? LIMIT 1;';
    const res = await this.db!.query(sql, excludeId ? [barcode, excludeId] : [barcode]);
    const rows = res.values ?? [];
    return rows.length ? this.rowToBluray(rows[0]) : null;
  }

  async findBlurayByTitle(title: string, excludeId?: number): Promise<Bluray | null> {
    const sql = excludeId
      ? 'SELECT id, title, original_title, director, genre, saga, volume, steelbook, watched, animated, status, rating, notes, barcode, cover_img, created_at FROM blurays WHERE LOWER(title) = LOWER(?) AND id != ? LIMIT 1;'
      : 'SELECT id, title, original_title, director, genre, saga, volume, steelbook, watched, animated, status, rating, notes, barcode, cover_img, created_at FROM blurays WHERE LOWER(title) = LOWER(?) LIMIT 1;';
    const res = await this.db!.query(sql, excludeId ? [title, excludeId] : [title]);
    const rows = res.values ?? [];
    return rows.length ? this.rowToBluray(rows[0]) : null;
  }

  async findBookByISBN(isbn: string, excludeId?: number): Promise<Book | null> {
    const sql = excludeId
      ? 'SELECT id, title, original_title, author, genre, isbn, saga, volume, status, rating, notes, created_at FROM books WHERE isbn = ? AND id != ? LIMIT 1;'
      : 'SELECT id, title, original_title, author, genre, isbn, saga, volume, status, rating, notes, created_at FROM books WHERE isbn = ? LIMIT 1;';
    const res = await this.db!.query(sql, excludeId ? [isbn, excludeId] : [isbn]);
    const rows = res.values ?? [];
    return rows.length ? this.rowToBook(rows[0]) : null;
  }

  async findBookByTitle(title: string, excludeId?: number): Promise<Book | null> {
    const sql = excludeId
      ? 'SELECT id, title, original_title, author, genre, isbn, saga, volume, status, rating, notes, created_at FROM books WHERE LOWER(title) = LOWER(?) AND id != ? LIMIT 1;'
      : 'SELECT id, title, original_title, author, genre, isbn, saga, volume, status, rating, notes, created_at FROM books WHERE LOWER(title) = LOWER(?) LIMIT 1;';
    const res = await this.db!.query(sql, excludeId ? [title, excludeId] : [title]);
    const rows = res.values ?? [];
    return rows.length ? this.rowToBook(rows[0]) : null;
  }

  // ---- Restore from backup ----

  async restoreFromBackup(blurays: Bluray[], books: Book[]): Promise<void> {
    await this.db!.execute('DELETE FROM blurays;');
    await this.db!.execute('DELETE FROM books;');
    for (const b of blurays) {
      await this.db!.run(
        `INSERT INTO blurays (title, original_title, director, genre, saga, volume, steelbook, watched, animated, status, rating, notes, barcode, cover_img, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [b.title, b.original_title, b.director, b.genre, b.saga, b.volume, b.steelbook ? 1 : 0, b.watched ? 1 : 0, b.animated ? 1 : 0, b.status, b.rating, b.notes, b.barcode, b.cover_img ?? null, b.created_at]
      );
    }
    for (const b of books) {
      await this.db!.run(
        `INSERT INTO books (title, original_title, author, genre, isbn, saga, volume, read, status, rating, notes, cover_img, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [b.title, b.original_title, b.author, b.genre, b.isbn, b.saga, b.volume, b.read ? 1 : 0, b.status, b.rating, b.notes, b.cover_img ?? null, b.created_at]
      );
    }
    await this.saveIfWeb();
  }

  // ---- Director / Author stats ----

  async getDirectorsWithCount(): Promise<{ director: string; count: number }[]> {
    const res = await this.db!.query(
      `SELECT director FROM blurays WHERE director IS NOT NULL AND director != '';`
    );
    const countMap = new Map<string, number>();
    for (const row of res.values ?? []) {
      for (const name of (row['director'] as string).split(', ').map(s => s.trim()).filter(Boolean)) {
        countMap.set(name, (countMap.get(name) ?? 0) + 1);
      }
    }
    return [...countMap.entries()]
      .map(([director, count]) => ({ director, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getAuthorsWithCount(): Promise<{ author: string; count: number }[]> {
    const res = await this.db!.query(
      `SELECT author FROM books WHERE author IS NOT NULL AND author != '';`
    );
    const countMap = new Map<string, number>();
    for (const row of res.values ?? []) {
      for (const name of (row['author'] as string).split(', ').map(s => s.trim()).filter(Boolean)) {
        countMap.set(name, (countMap.get(name) ?? 0) + 1);
      }
    }
    return [...countMap.entries()]
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count);
  }

  async getStatsByDirector(director: string): Promise<DirectorStats> {
    const res = await this.db!.query(
      `SELECT status, watched, steelbook, animated, rating, genre
       FROM blurays WHERE director LIKE ?;`,
      [`%${director}%`]
    );
    const rows = res.values ?? [];
    const total = rows.length;
    const owned = rows.filter(r => r['status'] === 'owned').length;
    const wishlist = rows.filter(r => r['status'] === 'wishlist').length;
    const watched = rows.filter(r => r['watched']).length;
    const steelbook = rows.filter(r => r['steelbook']).length;
    const animated = rows.filter(r => r['animated']).length;
    const rated = rows.filter(r => r['rating'] !== null && r['rating'] !== undefined);
    const avgRating = rated.length
      ? Math.round(rated.reduce((s, r) => s + (r['rating'] as number), 0) / rated.length * 10) / 10
      : null;
    const genreMap = new Map<string, number>();
    for (const row of rows) {
      if (row['genre']) {
        for (const g of (row['genre'] as string).split(', ').map(s => s.trim()).filter(Boolean)) {
          genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
        }
      }
    }
    const genres = [...genreMap.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
    return { director, total, owned, wishlist, watched, steelbook, animated, avgRating, genres };
  }

  async getStatsByAuthor(author: string): Promise<AuthorStats> {
    const res = await this.db!.query(
      `SELECT status, read, rating, genre
       FROM books WHERE author LIKE ?;`,
      [`%${author}%`]
    );
    const rows = res.values ?? [];
    const total = rows.length;
    const owned = rows.filter(r => r['status'] === 'owned').length;
    const wishlist = rows.filter(r => r['status'] === 'wishlist').length;
    const read = rows.filter(r => r['read']).length;
    const rated = rows.filter(r => r['rating'] !== null && r['rating'] !== undefined);
    const avgRating = rated.length
      ? Math.round(rated.reduce((s, r) => s + (r['rating'] as number), 0) / rated.length * 10) / 10
      : null;
    const genreMap = new Map<string, number>();
    for (const row of rows) {
      if (row['genre']) {
        for (const g of (row['genre'] as string).split(', ').map(s => s.trim()).filter(Boolean)) {
          genreMap.set(g, (genreMap.get(g) ?? 0) + 1);
        }
      }
    }
    const genres = [...genreMap.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
    return { author, total, owned, wishlist, read, avgRating, genres };
  }

  // ---- Statistics ----

  async getStats(): Promise<LibraryStats> {
    const bRes = await this.db!.query(
      `SELECT status, COUNT(*) as cnt, AVG(CAST(rating AS REAL)) as avg_rating
       FROM blurays GROUP BY status;`
    );
    const bookRes = await this.db!.query(
      `SELECT status, COUNT(*) as cnt, AVG(CAST(rating AS REAL)) as avg_rating
       FROM books GROUP BY status;`
    );
    const boolRes = await this.db!.query(
      `SELECT
         SUM(watched)   as bluray_watched,
         SUM(steelbook) as bluray_steel
       FROM blurays;`
    );
    const bookBoolRes = await this.db!.query(
      `SELECT SUM(read) as book_read FROM books;`
    );

    const bRows = bRes.values ?? [];
    const bookRows = bookRes.values ?? [];
    const boolRow = (boolRes.values ?? [])[0] ?? {};
    const bookBoolRow = (bookBoolRes.values ?? [])[0] ?? {};

    const blurayOwned    = bRows.find(r => r.status === 'owned')?.cnt ?? 0;
    const blurayWishlist = bRows.find(r => r.status === 'wishlist')?.cnt ?? 0;
    const blurayWatched  = (boolRow['bluray_watched'] as number) ?? 0;
    const bluraySteel    = (boolRow['bluray_steel']   as number) ?? 0;
    const bookOwned      = bookRows.find(r => r.status === 'owned')?.cnt ?? 0;
    const bookWishlist   = bookRows.find(r => r.status === 'wishlist')?.cnt ?? 0;
    const bookRead       = (bookBoolRow['book_read'] as number) ?? 0;

    const bAvgRows   = bRows.filter(r => r.avg_rating !== null);
    const bookAvgRows = bookRows.filter(r => r.avg_rating !== null);

    const avgBlurayRating = bAvgRows.length
      ? bAvgRows.reduce((s, r) => s + r.avg_rating * r.cnt, 0) / (blurayOwned + blurayWishlist) || null
      : null;
    const avgBookRating = bookAvgRows.length
      ? bookAvgRows.reduce((s, r) => s + r.avg_rating * r.cnt, 0) / (bookOwned + bookWishlist) || null
      : null;

    return {
      totalBlurays:    blurayOwned + blurayWishlist,
      totalBooks:      bookOwned + bookWishlist,
      blurayOwned,
      blurayWishlist,
      blurayWatched,
      bluraySteel,
      bookOwned,
      bookWishlist,
      bookRead,
      avgBlurayRating: avgBlurayRating ? Math.round(avgBlurayRating * 10) / 10 : null,
      avgBookRating:   avgBookRating   ? Math.round(avgBookRating   * 10) / 10 : null,
    };
  }

  // ---- Private helpers ----

  private rowToBluray(row: Record<string, unknown>): Bluray {
    return {
      id:             row['id'] as number,
      title:          row['title'] as string,
      original_title: (row['original_title'] as string | null) ?? null,
      director:       (row['director'] as string | null) ?? null,
      genre:      (row['genre'] as string | null) ?? null,
      saga:       (row['saga'] as string | null) ?? null,
      volume:     (row['volume'] as number | null) ?? null,
      steelbook:  Boolean(row['steelbook']),
      watched:    Boolean(row['watched']),
      animated:   Boolean(row['animated']),
      status:     (row['status'] as Bluray['status']) ?? 'owned',
      rating:     (row['rating'] as Bluray['rating']) ?? null,
      notes:      (row['notes'] as string | null) ?? null,
      barcode:    (row['barcode'] as string | null) ?? null,
      cover_img:  (row['cover_img'] as string | null) ?? null,
      created_at: row['created_at'] as string,
    };
  }

  private rowToBook(row: Record<string, unknown>): Book {
    return {
      id:             row['id'] as number,
      title:          row['title'] as string,
      original_title: (row['original_title'] as string | null) ?? null,
      author:         (row['author'] as string | null) ?? null,
      genre:      (row['genre'] as string | null) ?? null,
      isbn:       (row['isbn'] as string | null) ?? null,
      saga:       (row['saga'] as string | null) ?? null,
      volume:     (row['volume'] as number | null) ?? null,
      read:       Boolean(row['read']),
      status:     (row['status'] as Book['status']) ?? 'owned',
      rating:     (row['rating'] as Book['rating']) ?? null,
      notes:      (row['notes'] as string | null) ?? null,
      cover_img:  (row['cover_img'] as string | null) ?? null,
      created_at: row['created_at'] as string,
    };
  }
}

export default DatabaseService.getInstance();
