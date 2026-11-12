import { create } from 'zustand'

interface AppState {
  theme: 'light' | 'dark'
  selectedSymbol: string
  activeTab: string
  setTheme: (t: 'light' | 'dark') => void
  setSelectedSymbol: (s: string) => void
  setActiveTab: (t: string) => void
}

export const useStore = create<AppState>((set) => ({
  theme: (localStorage.getItem('market-analysis-pro-theme') as 'light' | 'dark') || 'dark',
  selectedSymbol: 'NIFTY50',
  activeTab: 'dashboard',
  setTheme: (theme) => {
    localStorage.setItem('market-analysis-pro-theme', theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    set({ theme })
  },
  setSelectedSymbol: (selectedSymbol) => set({ selectedSymbol }),
  setActiveTab: (activeTab) => set({ activeTab }),
}))
