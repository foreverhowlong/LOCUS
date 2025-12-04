import { create } from 'zustand'

export interface BookMetadata {
  title: string
  creator: string
  language: string
}

interface BookState {
  bookData: ArrayBuffer | string | null // ArrayBuffer for dragged files, string for paths/urls
  metadata: BookMetadata | null
  currentCfi: string | null
  isLoading: boolean
  activeSelection: { text: string; cfi: string } | null
  activeLens: string | null
  setBook: (data: ArrayBuffer | string) => void
  setMetadata: (meta: BookMetadata) => void
  setLocation: (cfi: string) => void
  setLoading: (loading: boolean) => void
  setSelection: (sel: { text: string; cfi: string } | null) => void
  setLens: (lens: string | null) => void
  clearBook: () => void
}

export const useBookStore = create<BookState>((set) => ({
  bookData: null,
  metadata: null,
  currentCfi: null,
  isLoading: false,
  activeSelection: null,
  activeLens: null,
  setBook: (data) => set({ bookData: data }),
  setMetadata: (meta) => set({ metadata: meta }),
  setLocation: (cfi) => set({ currentCfi: cfi }),
  setLoading: (loading) => set({ isLoading: loading }),
  setSelection: (sel) => set({ activeSelection: sel }),
  setLens: (lens) => set({ activeLens: lens }),
  clearBook: () => set({ bookData: null, metadata: null, currentCfi: null, activeSelection: null, activeLens: null }),
}))
