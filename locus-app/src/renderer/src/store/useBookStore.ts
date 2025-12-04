import { create } from 'zustand'

export interface BookMetadata {
  title: string
  creator: string
  language: string
}

export interface TOCItem {
  id: string
  href: string
  label: string
  subitems?: TOCItem[]
}

interface BookState {
  bookData: ArrayBuffer | string | null
  metadata: BookMetadata | null
  toc: TOCItem[]
  currentCfi: string | null
  isLoading: boolean
  isTocOpen: boolean
  activeSelection: { text: string; cfi: string } | null
  activeLens: string | null
  
  setBook: (data: ArrayBuffer | string) => void
  setMetadata: (meta: BookMetadata) => void
  setToc: (toc: TOCItem[]) => void
  setLocation: (cfi: string) => void
  setLoading: (loading: boolean) => void
  setTocOpen: (isOpen: boolean) => void
  setSelection: (sel: { text: string; cfi: string } | null) => void
  setLens: (lens: string | null) => void
  clearBook: () => void
}

export const useBookStore = create<BookState>((set) => ({
  bookData: null,
  metadata: null,
  toc: [],
  currentCfi: null,
  isLoading: false,
  isTocOpen: false,
  activeSelection: null,
  activeLens: null,
  
  setBook: (data) => set({ bookData: data }),
  setMetadata: (meta) => set({ metadata: meta }),
  setToc: (toc) => set({ toc: toc }),
  setLocation: (cfi) => set({ currentCfi: cfi }),
  setLoading: (loading) => set({ isLoading: loading }),
  setTocOpen: (isOpen) => set({ isTocOpen: isOpen }),
  setSelection: (sel) => set({ activeSelection: sel }),
  setLens: (lens) => set({ activeLens: lens }),
  clearBook: () => set({ 
    bookData: null, 
    metadata: null, 
    toc: [], 
    currentCfi: null, 
    activeSelection: null, 
    activeLens: null,
    isTocOpen: false 
  }),
}))
