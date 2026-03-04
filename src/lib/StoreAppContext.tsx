'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'storeApp';

const StoreAppContext = createContext<boolean>(false);

export function StoreAppProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [isStoreApp, setIsStoreApp] = useState(false);

  const check = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const fromUrl = searchParams?.get('app') === '1';
    if (fromUrl) {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1');
      } catch {}
      return true;
    }
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }, [searchParams]);

  useEffect(() => {
    setIsStoreApp(check());
  }, [check]);

  return (
    <StoreAppContext.Provider value={isStoreApp}>
      {children}
    </StoreAppContext.Provider>
  );
}

export function useStoreApp(): boolean {
  return useContext(StoreAppContext);
}
