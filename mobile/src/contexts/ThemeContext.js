import React, { createContext, useContext, useState, useEffect } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ThemeContext = createContext()

export const themes = {
  light: {
    dark: false,
    colors: {
      primary: '#3b82f6',
      background: '#f3f4f6',
      surface: '#ffffff',
      text: '#111827',
      textSecondary: '#6b7280',
      border: '#e5e7eb',
      error: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      info: '#3b82f6',
    }
  },
  dark: {
    dark: true,
    colors: {
      primary: '#60a5fa',
      background: '#0f172a',
      surface: '#1e293b',
      text: '#f1f5f9',
      textSecondary: '#94a3b8',
      border: '#334155',
      error: '#f87171',
      warning: '#fbbf24',
      success: '#4ade80',
      info: '#60a5fa',
    }
  },
  midnight: {
    dark: true,
    colors: {
      primary: '#818cf8',
      background: '#020617',
      surface: '#0f172a',
      text: '#e2e8f0',
      textSecondary: '#64748b',
      border: '#1e293b',
      error: '#f87171',
      warning: '#fcd34d',
      success: '#34d399',
      info: '#60a5fa',
    }
  }
}

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme()
  const [themeName, setThemeName] = useState('light')
  const [followSystem, setFollowSystem] = useState(true)

  useEffect(() => {
    loadThemePreference()
  }, [])

  useEffect(() => {
    if (followSystem) {
      setThemeName(systemColorScheme === 'dark' ? 'dark' : 'light')
    }
  }, [systemColorScheme, followSystem])

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@osint_theme')
      const savedFollowSystem = await AsyncStorage.getItem('@osint_follow_system')
      
      if (savedFollowSystem !== null) {
        setFollowSystem(savedFollowSystem === 'true')
      }
      
      if (savedTheme && !followSystem) {
        setThemeName(savedTheme)
      }
    } catch (error) {
      console.error('Failed to load theme:', error)
    }
  }

  const setTheme = async (name) => {
    if (themes[name]) {
      setThemeName(name)
      setFollowSystem(false)
      await AsyncStorage.setItem('@osint_theme', name)
      await AsyncStorage.setItem('@osint_follow_system', 'false')
    }
  }

  const toggleFollowSystem = async (value) => {
    setFollowSystem(value)
    await AsyncStorage.setItem('@osint_follow_system', value.toString())
    if (value) {
      setThemeName(systemColorScheme === 'dark' ? 'dark' : 'light')
    }
  }

  const value = {
    theme: themes[themeName],
    themeName,
    setTheme,
    followSystem,
    setFollowSystem: toggleFollowSystem,
    availableThemes: Object.keys(themes)
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
