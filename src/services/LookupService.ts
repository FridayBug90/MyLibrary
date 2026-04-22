import { CapacitorHttp, HttpResponse } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import { OMDB_API_KEY, TMDB_API_KEY } from '../config/api';
import { log } from '../utils/logger';

const OMDB_GENRE_MAP: Record<string, string> = {
  'Action':      'Azione',
  'Adventure':   'Avventura',
  'Animation':   'Animazione',
  'Biography':   'Biografico',
  'Comedy':      'Commedia',
  'Crime':       'Crimine',
  'Documentary': 'Documentario',
  'Drama':       'Drammatico',
  'Sci-Fi':      'Fantascienza',
  'Fantasy':     'Fantasy',
  'War':         'Guerra',
  'Horror':      'Horror',
  'Musical':     'Musical',
  'Music':       'Musical',
  'Mystery':     'Mystery',
  'Romance':     'Romantico',
  'History':     'Storico',
  'Thriller':    'Thriller',
  'Western':     'Western',
};

function mapOmdbGenres(omdbGenre: string): string | null {
  const mapped = omdbGenre
    .split(',')
    .map(g => OMDB_GENRE_MAP[g.trim()])
    .filter(Boolean) as string[];
  return mapped.length ? [...new Set(mapped)].join(', ') : null;
}

// TMDB returns Italian names directly; a few need remapping to match our genre list
const TMDB_GENRE_IT_MAP: Record<string, string> = {
  'Dramma':    'Drammatico',
  'Crime':     'Crimine',
  'Storia':    'Storico',
  'Musica':    'Musical',
  'Mistero':   'Mystery',
  'Romance':   'Romantico',
  // skip these (not in our genre list)
  'Famiglia':  '',
  'Film TV':   '',
};

function mapTmdbGenres(genres: { id: number; name: string }[]): string | null {
  const mapped = genres
    .map(g => TMDB_GENRE_IT_MAP[g.name] !== undefined ? TMDB_GENRE_IT_MAP[g.name] : g.name)
    .filter(Boolean);
  return mapped.length ? mapped.join(', ') : null;
}

export interface BookLookupResult {
  title: string;
  author: string | null;
  year: number | null;
  isbn: string;
  coverUrl: string | null;
}

export interface BlurayLookupResult {
  title: string;
  original_title: string | null;
  barcode: string | null;
  brand: string | null;
  imageUrl: string | null;
  director: string | null;
  genre: string | null;
  /** true = trovato su UPCitemdb ma non su OMDB; dati film incompleti */
  partial: boolean;
}

async function httpGet(url: string): Promise<unknown> {
  if (Capacitor.isNativePlatform()) {
    const res: HttpResponse = await CapacitorHttp.get({ url });
    if (res.status < 200 || res.status >= 300) throw new Error(`HTTP ${res.status}`);
    return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export class LookupService {
  static async lookupBookByISBN(isbn: string): Promise<BookLookupResult | null> {
    const clean = isbn.replace(/[-\s]/g, '');
    log.info('LookupService', `ISBN lookup: ${clean}`);

    // 1) Open Library (no API key, no rate limit)
    try {
      log.info('LookupService', `Open Library → ISBN:${clean}`);
      const olData = await httpGet(
        `https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`
      ) as Record<string, any>;
      const key = `ISBN:${clean}`;
      if (olData[key]) {
        const book = olData[key] as Record<string, any>;
        const author: string | null = (book.authors as any[])?.map((a: any) => a.name).join(', ') ?? null;
        const coverUrl: string | null = (book.cover as any)?.medium?.replace('http://', 'https://') ?? (book.cover as any)?.thumbnail?.replace('http://', 'https://') ?? null;
        const rawDate: string = book.publish_date ?? '';
        const yearMatch = rawDate.match(/\d{4}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : null;
        const result = { title: book.title as string, author, year, isbn: clean, coverUrl };
        log.info('LookupService', 'Open Library: trovato', result);
        return result;
      }
      log.warn('LookupService', 'Open Library: nessun risultato, provo Google Books');
    } catch (e) {
      log.warn('LookupService', `Open Library: errore (${e instanceof Error ? e.message : String(e)}), provo Google Books`);
    }

    // 2) Google Books fallback
    try {
      log.info('LookupService', `Google Books → q=isbn:${clean}`);
      const data = await httpGet(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${clean}`
      ) as Record<string, any>;
      log.info('LookupService', `Google Books response: totalItems=${data.totalItems}`);
      if (data.totalItems && data.items?.length) {
        const info = data.items[0].volumeInfo;
        const author: string | null = info.authors?.join(', ') ?? null;
        const year = info.publishedDate ? (info.publishedDate.match(/\d{4}/)?.[0] ? parseInt(info.publishedDate.match(/\d{4}/)[0]) : null) : null;
        const coverUrl: string | null = info.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null;
        const result = { title: info.title, author, year, isbn: clean, coverUrl };
        log.info('LookupService', 'Google Books: trovato', result);
        return result;
      }
      log.warn('LookupService', 'Google Books: nessun risultato');
    } catch (e) {
      log.warn('LookupService', `Google Books: errore (${e instanceof Error ? e.message : String(e)})`);
    }

    return null;
  }

  static async lookupBookByTitle(title: string): Promise<BookLookupResult | null> {
    const clean = title.trim();

    // 1) Open Library search (no API key needed, reliable)
    try {
      log.info('LookupService', `Open Library title search: "${clean}"`);
      const data = await httpGet(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(clean)}&limit=1`
      ) as Record<string, any>;
      const doc = data.docs?.[0];
      if (doc) {
        const author: string | null = (doc.author_name as string[] | undefined)?.join(', ') ?? null;
        const isbn = (doc.isbn as string[] | undefined)?.[0] ?? '';
        const coverId: number | undefined = doc.cover_i;
        const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : null;
        const result = { title: doc.title as string, author, year: doc.first_publish_year ?? null, isbn, coverUrl };
        log.info('LookupService', 'Open Library by title: trovato', result);
        return result;
      }
      log.warn('LookupService', 'Open Library: nessun risultato, provo Google Books');
    } catch (e) {
      log.warn('LookupService', `Open Library by title: errore (${e instanceof Error ? e.message : String(e)}), provo Google Books`);
    }

    // 2) Google Books fallback
    try {
      log.info('LookupService', `Google Books title lookup: "${clean}"`);
      const data = await httpGet(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(clean)}&maxResults=1`
      ) as Record<string, any>;
      log.info('LookupService', `Google Books response: totalItems=${data.totalItems}`);
      if (!data.totalItems || !data.items?.length) {
        log.warn('LookupService', 'Google Books: nessun risultato per titolo');
        return null;
      }
      const info = data.items[0].volumeInfo;
      const author: string | null = info.authors?.join(', ') ?? null;
      const year = info.publishedDate ? (info.publishedDate.match(/\d{4}/)?.[0] ? parseInt(info.publishedDate.match(/\d{4}/)[0]) : null) : null;
      const coverUrl: string | null = info.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null;
      const isbn13 = info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_13')?.identifier ?? '';
      const isbn10 = info.industryIdentifiers?.find((id: any) => id.type === 'ISBN_10')?.identifier ?? '';
      const isbn = isbn13 || isbn10;
      const result = { title: info.title, author, year, isbn, coverUrl };
      log.info('LookupService', 'Google Books by title: trovato', result);
      return result;
    } catch (e) {
      log.error('LookupService', `Google Books by title: errore (${e instanceof Error ? e.message : String(e)})`);
      return null;
    }
  }

  static async lookupBlurayByBarcode(barcode: string): Promise<BlurayLookupResult | null> {
    const clean = barcode.replace(/[-\s]/g, '');
    log.info('LookupService', `Barcode lookup: ${clean}`);

    // Step 1: barcode → titolo prodotto via UPCitemdb
    log.info('LookupService', `UPCitemdb → upc=${clean}`);
    const upcData = await httpGet(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${clean}`
    ) as Record<string, any>;
    log.info('LookupService', `UPCitemdb response: code=${upcData.code}, items=${upcData.items?.length ?? 0}`);

    if (upcData.code !== 'OK' || !upcData.items?.length) {
      log.warn('LookupService', 'UPCitemdb: barcode non trovato');
      return null;
    }

    const item = upcData.items[0];
    log.info('LookupService', `UPCitemdb: trovato "${item.title}" (brand: ${item.brand ?? 'n/a'})`);

    const result: BlurayLookupResult = {
      title:          item.title,
      original_title: null,
      barcode:        clean,
      brand:          item.brand ?? null,
      imageUrl:       item.images?.[0] ?? null,
      director:       null,
      genre:          null,
      partial:        true,
    };

    // Step 2: titolo → dati film via OMDB
    try {
      const cleanTitle = item.title
        .replace(/\s*[\[(][^\])]*\b(blu.?ray|4k|uhd|dvd|digital hd?)\b[^\])]*[\])]/gi, '')
        .replace(/\s*\(\d{4}\)\s*$/i, '')
        .trim();
      log.info('LookupService', `OMDB → t="${cleanTitle}"`);

      const omdb = await httpGet(
        `https://www.omdbapi.com/?t=${encodeURIComponent(cleanTitle)}&type=movie&apikey=${OMDB_API_KEY}`
      ) as Record<string, any>;
      log.info('LookupService', `OMDB response: Response=${omdb.Response}`, omdb.Response === 'True'
        ? { Title: omdb.Title, Director: omdb.Director, Genre: omdb.Genre, Year: omdb.Year }
        : { Error: omdb.Error });

      if (omdb.Response === 'True') {
        result.director       = omdb.Director && omdb.Director !== 'N/A' ? omdb.Director : null;
        result.genre          = omdb.Genre    && omdb.Genre    !== 'N/A' ? mapOmdbGenres(omdb.Genre) : null;
        result.original_title = omdb.Title ?? null;
        if (omdb.Title) result.title = omdb.Title;
        if (omdb.Poster && omdb.Poster !== 'N/A') result.imageUrl = omdb.Poster;
        result.partial = false;
        log.info('LookupService', `OMDB: arricchito → director="${result.director}", genre="${result.genre}"`);
      } else if (omdb.Error === 'Request limit reached!') {
        log.warn('LookupService', 'OMDB: limite giornaliero raggiunto — dati parziali (solo UPCitemdb)');
      } else {
        log.warn('LookupService', `OMDB: film non trovato per titolo "${cleanTitle}" — dati parziali`);
      }
    } catch (e) {
      log.error('LookupService', `OMDB: errore di rete (${e instanceof Error ? e.message : String(e)}) — dati parziali`);
    }

    return result;
  }

  static async lookupBlurayByTitle(title: string): Promise<BlurayLookupResult | null> {
    const clean = title.trim();
    log.info('LookupService', `TMDB search: "${clean}"`);
    try {
      // Step 1: cerca il film su TMDB in italiano
      const searchData = await httpGet(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(clean)}&language=it-IT`
      ) as Record<string, any>;
      log.info('LookupService', `TMDB search: total_results=${searchData.total_results}`);

      if (!searchData.results?.length) {
        log.warn('LookupService', `TMDB: nessun risultato per "${clean}"`);
        return null;
      }

      const movie = searchData.results[0];
      const movieId: number = movie.id;
      log.info('LookupService', `TMDB: trovato "${movie.title}" (id=${movieId}, original="${movie.original_title}")`);

      // Step 2: dettagli + credits in un'unica chiamata
      const detail = await httpGet(
        `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=it-IT&append_to_response=credits`
      ) as Record<string, any>;

      const directors = ((detail.credits?.crew ?? []) as any[])
        .filter((c: any) => c.job === 'Director')
        .map((c: any) => c.name as string);
      const director = directors.length ? directors.join(', ') : null;

      const genre    = mapTmdbGenres(detail.genres ?? []);
      const imageUrl = movie.poster_path
        ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
        : null;

      log.info('LookupService', `TMDB: director="${director}", genre="${genre}"`);

      return {
        title:          movie.title as string,
        original_title: (movie.original_title as string) ?? null,
        barcode:        null,
        brand:          null,
        imageUrl,
        director,
        genre,
        partial:        false,
      };
    } catch (e) {
      log.error('LookupService', `TMDB: errore (${e instanceof Error ? e.message : String(e)})`);
      return null;
    }
  }
}
