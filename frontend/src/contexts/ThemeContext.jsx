import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const themes = {
  light: {
    colors: {
      primary: '#3b82f6',
      secondary: '#8b5cf6',
      background: '#f3f4f6',
      surface: '#ffffff',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      error: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      info: '#3b82f6',
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#ca8a04',
      low: '#2563eb',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    }
  },
  dark: {
    colors: {
      primary: '#60a5fa',
      secondary: '#a78bfa',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      error: '#f87171',
      warning: '#fbbf24',
      success: '#4ade80',
      info: '#60a5fa',
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#3b82f6',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    }
  },
  // Additional themes
  midnight: {
    colors: {
      primary: '#818cf8',
      secondary: '#c084fc',
      background: '#020617',
      surface: '#0f172a',
      text: '#e2e8f0',
      textSecondary: '#64748b',
      border: '#1e293b',
      error: '#f87171',
      warning: '#fcd34d',
      success: '#34d399',
      info: '#60a5fa',
      critical: '#ef4444',
      high: '#fb923c',
      medium: '#facc15',
      low: '#22d3ee',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.6)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.7)',
    }
  },
  ocean: {
    colors: {
      primary: '#0ea5e9',
      secondary: '#06b6d4',
      background: '#0c4a6e',
      surface: '#075985',
      text: '#f0f9ff',
      textSecondary: '#7dd3fc',
      border: '#0369a1',
      error: '#fca5a5',
      warning: '#fde047',
      success: '#86efac',
      info: '#7dd3fc',
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#38bdf8',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
    }
  }
}

export const ThemeProvider = ({ children }) => {
  const [themeName, setThemeName] = useState('light')
  const [systemPreference, setSystemPreference] = useState(false)

  useEffect(() => {
    // Load saved theme
    const savedTheme = localStorage.getItem('osint-theme')
    const savedSystemPref = localStorage.getItem('osint-system-theme') === 'true'
    
    if (savedTheme && themes[savedTheme]) {
      setThemeName(savedTheme)
    }
    setSystemPreference(savedSystemPref)

    // Listen to system changes
    if (savedSystemPref) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = (e) => {
        setThemeName(e.matches ? 'dark' : 'light')
      }
      
      mediaQuery.addEventListener('change', handleChange)
      handleChange(mediaQuery) // Set initial
      
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const setTheme = (name) => {
    if (themes[name]) {
      setThemeName(name)
      localStorage.setItem('osint-theme', name)
      setSystemPreference(false)
      localStorage.setItem('osint-system-theme', 'false')
    }
  }

  const toggleTheme = () => {
    const newTheme = themeName === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }

  const followSystem = () => {
    setSystemPreference(true)
    localStorage.setItem('osint-system-theme', 'true')
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setThemeName(mediaQuery.matches ? 'dark' : 'light')
  }

  const value = {
    theme: themes[themeName],
    themeName,
    setTheme,
    toggleTheme,
    followSystem,
    systemPreference,
    availableThemes: Object.keys(themes)
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
