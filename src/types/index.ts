export type BlurayStatus = 'owned' | 'wishlist';
export type BookStatus = 'owned' | 'wishlist';
export type Rating = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | null;

export interface Bluray {
  id: number;
  title: string;
  original_title: string | null;
  director: string | null;
  genre: string | null;
  saga: string | null;
  volume: number | null;
  steelbook: boolean;
  watched: boolean;
  animated: boolean;
  status: BlurayStatus;
  rating: Rating;
  notes: string | null;
  barcode: string | null;
  cover_img: string | null;
  created_at: string;
}

export type BlurayInput = Omit<Bluray, 'id' | 'created_at'>;

export interface Book {
  id: number;
  title: string;
  original_title: string | null;
  author: string | null;
  genre: string | null;
  isbn: string | null;
  saga: string | null;
  volume: number | null;
  read: boolean;
  status: BookStatus;
  rating: Rating;
  notes: string | null;
  cover_img: string | null;
  created_at: string;
}

export type BookInput = Omit<Book, 'id' | 'created_at'>;

export interface LibraryStats {
  totalBlurays: number;
  totalBooks: number;
  blurayOwned: number;
  blurayWishlist: number;
  blurayWatched: number;
  bluraySteel: number;
  bookOwned: number;
  bookWishlist: number;
  bookRead: number;
  avgBlurayRating: number | null;
  avgBookRating: number | null;
}

export interface DirectorStats {
  director: string;
  total: number;
  owned: number;
  wishlist: number;
  watched: number;
  steelbook: number;
  animated: number;
  avgRating: number | null;
  genres: string[];
}

export interface AuthorStats {
  author: string;
  total: number;
  owned: number;
  wishlist: number;
  read: number;
  avgRating: number | null;
  genres: string[];
}
