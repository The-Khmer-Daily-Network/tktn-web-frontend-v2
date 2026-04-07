"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import type { AdvertisementImage } from "@/types/advertisement";

interface AdvertisementContextType {
  images: AdvertisementImage[];
  loading: boolean;
  getImageByPosition: (position: string) => AdvertisementImage | null;
  refreshImages: () => Promise<void>;
}

const AdvertisementContext = createContext<AdvertisementContextType | undefined>(
  undefined,
);

export function AdvertisementProvider({ children }: { children: ReactNode }) {
  const [images, setImages] = useState<AdvertisementImage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImages = useCallback(async () => {
    setImages([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const getImageByPosition = useCallback(
    (position: string): AdvertisementImage | null => {
      return images.find((img) => img.position === position) || null;
    },
    [images]
  );

  const refreshImages = useCallback(async () => {
    setLoading(true);
    await fetchImages();
  }, [fetchImages]);

  const value = useMemo<AdvertisementContextType>(
    () => ({
      images,
      loading,
      getImageByPosition,
      refreshImages,
    }),
    [images, loading, getImageByPosition, refreshImages]
  );

  return (
    <AdvertisementContext.Provider value={value}>
      {children}
    </AdvertisementContext.Provider>
  );
}

export function useAdvertisement() {
  const context = useContext(AdvertisementContext);
  if (context === undefined) {
    throw new Error(
      "useAdvertisement must be used within an AdvertisementProvider",
    );
  }
  return context;
}

