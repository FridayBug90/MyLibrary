import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import DatabaseService from '../services/DatabaseService';
import { Bluray, BlurayInput, Book, BookInput, LibraryStats } from '../types';

interface LibraryContextValue {
  blurays: Bluray[];
  books: Book[];
  stats: LibraryStats | null;
  isLoading: boolean;
  error: string | null;

  loadBlurays: () => Promise<void>;
  searchBlurays: (query: string) => Promise<void>;
  addBluray: (data: BlurayInput) => Promise<void>;
  updateBluray: (id: number, data: BlurayInput) => Promise<void>;
  deleteBluray: (id: number) => Promise<void>;

  loadBooks: () => Promise<void>;
  searchBooks: (query: string) => Promise<void>;
  addBook: (data: BookInput) => Promise<void>;
  updateBook: (id: number, data: BookInput) => Promise<void>;
  deleteBook: (id: number) => Promise<void>;

  refreshStats: () => Promise<void>;
}

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export const LibraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [blurays, setBlurays] = useState<Bluray[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const withLoading = async (fn: () => Promise<void>) => {
    setIsLoading(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStats = useCallback(async () => {
    const s = await DatabaseService.getStats();
    setStats(s);
  }, []);

  const loadBlurays = useCallback(async () => {
    await withLoading(async () => {
      const data = await DatabaseService.getAllBlurays();
      setBlurays(data);
    });
  }, []);

  const searchBlurays = useCallback(async (query: string) => {
    await withLoading(async () => {
      const data = query.trim()
        ? await DatabaseService.searchBlurays(query)
        : await DatabaseService.getAllBlurays();
      setBlurays(data);
    });
  }, []);

  const addBluray = useCallback(async (data: BlurayInput) => {
    await withLoading(async () => {
      await DatabaseService.addBluray(data);
      const updated = await DatabaseService.getAllBlurays();
      setBlurays(updated);
      const s = await DatabaseService.getStats();
      setStats(s);
    });
  }, []);

  const updateBluray = useCallback(async (id: number, data: BlurayInput) => {
    await withLoading(async () => {
      await DatabaseService.updateBluray(id, data);
      const updated = await DatabaseService.getAllBlurays();
      setBlurays(updated);
    });
  }, []);

  const deleteBluray = useCallback(async (id: number) => {
    await withLoading(async () => {
      await DatabaseService.deleteBluray(id);
      setBlurays(prev => prev.filter(b => b.id !== id));
      const s = await DatabaseService.getStats();
      setStats(s);
    });
  }, []);

  const loadBooks = useCallback(async () => {
    await withLoading(async () => {
      const data = await DatabaseService.getAllBooks();
      setBooks(data);
    });
  }, []);

  const searchBooks = useCallback(async (query: string) => {
    await withLoading(async () => {
      const data = query.trim()
        ? await DatabaseService.searchBooks(query)
        : await DatabaseService.getAllBooks();
      setBooks(data);
    });
  }, []);

  const addBook = useCallback(async (data: BookInput) => {
    await withLoading(async () => {
      await DatabaseService.addBook(data);
      const updated = await DatabaseService.getAllBooks();
      setBooks(updated);
      const s = await DatabaseService.getStats();
      setStats(s);
    });
  }, []);

  const updateBook = useCallback(async (id: number, data: BookInput) => {
    await withLoading(async () => {
      await DatabaseService.updateBook(id, data);
      const updated = await DatabaseService.getAllBooks();
      setBooks(updated);
    });
  }, []);

  const deleteBook = useCallback(async (id: number) => {
    await withLoading(async () => {
      await DatabaseService.deleteBook(id);
      setBooks(prev => prev.filter(b => b.id !== id));
      const s = await DatabaseService.getStats();
      setStats(s);
    });
  }, []);

  return (
    <LibraryContext.Provider value={{
      blurays, books, stats, isLoading, error,
      loadBlurays, searchBlurays, addBluray, updateBluray, deleteBluray,
      loadBooks, searchBooks, addBook, updateBook, deleteBook,
      refreshStats,
    }}>
      {children}
    </LibraryContext.Provider>
  );
};

export const useLibrary = (): LibraryContextValue => {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
};
