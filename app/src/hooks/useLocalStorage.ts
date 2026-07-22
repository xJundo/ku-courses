import { useState, useEffect } from 'react';
import { loadLocalStorage, saveLocalStorage } from '../utils/storage';

export function useLocalStorageState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => loadLocalStorage(key, defaultValue));

  useEffect(() => {
    saveLocalStorage(key, state);
  }, [key, state]);

  return [state, setState];
}
