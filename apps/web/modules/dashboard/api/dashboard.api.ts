import { httpClient } from "@/core/api/http-client";
import type { DashboardStats } from "../data/dashboard.types";

export const dashboardApi = {
  stats: (days?: number) =>
    httpClient<DashboardStats>("/api/stats", {
      params: days ? { days } : undefined,
      cache: "no-store",
    }),
};