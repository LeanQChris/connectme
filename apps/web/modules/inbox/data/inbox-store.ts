import { create } from "zustand";

export interface InboxState {
  filter: string;
  accountId: string;
  selectedId: string | null;
  searchQuery: string;

  setFilter: (filter: string) => void;
  setAccountId: (accountId: string) => void;
  setSelectedId: (selectedId: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useInboxStore = create<InboxState>((set) => ({
  filter: "",
  accountId: "",
  selectedId: null,
  searchQuery: "",

  setFilter: (filter) => set({ filter, accountId: "" }),
  setAccountId: (accountId) => set({ accountId }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
