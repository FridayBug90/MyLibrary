import { useEffect, useState } from 'react';
import DatabaseService from '../services/DatabaseService';

export const useDatabase = () => {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    DatabaseService.initialize()
      .then(() => { if (mounted) setIsReady(true); })
      .catch((e: Error) => { if (mounted) setError(e.message); });
    return () => { mounted = false; };
  }, []);

  return { isReady, error };
};
