# My Library

A personal collection manager for Blu-rays and books, built with Ionic React and Capacitor. Runs on Android and in the browser, with a local SQLite database and optional automatic backup to Google Drive.

---

## Features

### Blu-ray Collection
- Add, edit, and delete Blu-ray entries
- Track status: **owned** or **wishlist**
- Mark as **watched**, **steelbook**, or **animated**
- Assign a **rating** (1–10) and free-form **notes**
- Organize by **saga** and **volume**
- Auto-lookup by **barcode** (UPCitemdb → OMDb) or by **title** (TMDb)
- Cover image fetched automatically from OMDb / TMDb

### Book Collection
- Add, edit, and delete book entries
- Track status: **owned** or **wishlist**
- Mark as **read**
- Assign a **rating** (1–10) and free-form **notes**
- Organize by **saga** and **volume**
- Auto-lookup by **ISBN** (Open Library → Google Books) or by **title**
- Cover image fetched automatically

### Search & Filter
- Real-time search by title, director, or author
- Filter by status, watched/read, steelbook, animated, genre, saga
- Sort by title, rating, genre, status, or director/author
- Paginated list with infinite scroll

### Statistics
- Global stats: totals, owned vs. wishlist, watched/read counts, average ratings
- Per-director and per-author breakdown: film count, steelbook, animated, genres, average rating
- Searchable director/author list

### Backup
- Automatic daily backup to **Google Drive** (Android only, requires sign-in)
- Manual export and import from Drive
- Backup stored as a JSON file in your personal Drive

---

## How to Use

### Running in the browser

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The database is stored in the browser via IndexedDB.

### Building for Android

```bash
npm run build
npx cap sync android
```

Then open the `android/` folder in Android Studio and run on a device or emulator.

### Adding a Blu-ray

1. Open the **Blu-ray** tab.
2. Tap the **+** button.
3. Either scan the barcode (Android) or type the title to auto-fill details from the web, or fill in fields manually.
4. Set status, rating, and any other details, then save.

### Adding a Book

1. Open the **Books** tab.
2. Tap the **+** button.
3. Enter the ISBN or title to auto-fill from Open Library / Google Books, or fill in manually.
4. Set status, rating, and notes, then save.

### Google Drive Backup (Android)

1. Open the **Statistics** tab and tap the account icon.
2. Sign in with your Google account.
3. Backup runs automatically once a day after 04:00.
4. To restore, tap **Import from Drive** from the same menu.

### Tech Stack

| Layer | Technology |
|---|---|
| UI | Ionic React 8, React Router 5 |
| Language | TypeScript |
| Database | SQLite via `@capacitor-community/sqlite` |
| Mobile | Capacitor 8 (Android) |
| Build | Vite |
| Tests | Vitest (unit), Cypress (e2e) |
| Lookup APIs | OMDb, TMDb, UPCitemdb, Open Library, Google Books |
