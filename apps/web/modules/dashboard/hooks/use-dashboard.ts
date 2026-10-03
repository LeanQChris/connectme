"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../api/dashboard.api";

export const DASHBOARD_KEYS = {
  stats: (days: number) => ["stats", { days }] as const,
};

export function useDashboardStats(days: number) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.stats(days),
    queryFn: () => dashboardApi.stats(days),
    refetchInterval: 30000,
    staleTime: 15000,
  });
}