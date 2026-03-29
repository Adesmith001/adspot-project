import { useState, useEffect, useCallback } from "react";
import { DocumentSnapshot } from "firebase/firestore";
import { searchBillboards } from "@/services/billboard.service";
import type {
  Billboard,
  SearchFilters,
  SortOption,
} from "@/types/billboard.types";

interface UseBillboardsResult {
  billboards: Billboard[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateFilters: (filters: SearchFilters) => void;
  updateSort: (sort: SortOption) => void;
}

export const useBillboards = (
  initialFilters: SearchFilters = {},
  initialSort: SortOption = "newest",
  pageSize: number = 20,
): UseBillboardsResult => {
  const [billboards, setBillboards] = useState<Billboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);

  const fetchBillboards = useCallback(
    async (reset: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        const result = await searchBillboards(
          filters,
          sortBy,
          pageSize,
          reset ? undefined : lastDoc || undefined,
        );

        if (reset) {
          setBillboards(result.billboards);
        } else {
          setBillboards((prev) => [...prev, ...result.billboards]);
        }

        setLastDoc(result.lastDoc);
        setHasMore(result.billboards.length === pageSize);
      } catch (err: any) {
        setError(err.message || "Failed to fetch billboards");
      } finally {
        setLoading(false);
      }
    },
    [filters, sortBy, pageSize, lastDoc],
  );

  useEffect(() => {
    fetchBillboards(true);
  }, [filters, sortBy]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchBillboards(false);
    }
  }, [loading, hasMore, fetchBillboards]);

  const refresh = useCallback(async () => {
    setLastDoc(null);
    await fetchBillboards(true);
  }, [fetchBillboards]);

  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    setLastDoc(null);
  }, []);

  const updateSort = useCallback((newSort: SortOption) => {
    setSortBy(newSort);
    setLastDoc(null);
  }, []);

  return {
    billboards,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    updateFilters,
    updateSort,
  };
};
