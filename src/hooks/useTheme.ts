import { create } from 'zustand'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  isDark: boolean
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem('zen_theme')
  if (saved === 'dark' || saved === 'light') return saved
  return 'light'
}

const applyThemeToDOM = (theme: Theme) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

// Apply on initial script evaluation
if (typeof window !== 'undefined') {
  applyThemeToDOM(getInitialTheme())
}

export const useTheme = create<ThemeState>((set) => ({
  theme: getInitialTheme(),
  isDark: getInitialTheme() === 'dark',
  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('zen_theme', nextTheme)
      applyThemeToDOM(nextTheme)
      return { theme: nextTheme, isDark: nextTheme === 'dark' }
    })
  },
  setTheme: (theme: Theme) => {
    localStorage.setItem('zen_theme', theme)
    applyThemeToDOM(theme)
    set({ theme, isDark: theme === 'dark' })
  },
}))
