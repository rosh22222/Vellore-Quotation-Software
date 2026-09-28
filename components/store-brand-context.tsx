"use client";

import { createContext, useContext } from "react";

const StoreBrandContext = createContext<string | null>(null);

export function StoreBrandProvider({
  storeCode,
  children
}: {
  storeCode?: string | null;
  children: React.ReactNode;
}) {
  return (
    <StoreBrandContext.Provider value={storeCode || null}>
      {children}
    </StoreBrandContext.Provider>
  );
}

export function useStoreBrandCode() {
  return useContext(StoreBrandContext);
}
