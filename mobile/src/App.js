import React, { useEffect, useState } from 'react'
import { StatusBar, useColorScheme } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Provider as PaperProvider } from 'react-native-paper'
import { Provider as ReduxProvider } from 'react-redux'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import { store } from './store'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

// Screens
import LoginScreen from './screens/Auth/LoginScreen'
import DashboardScreen from './screens/Dashboard/DashboardScreen'
import ScansScreen from './screens/Scans/ScansScreen'
import ScanDetailScreen from './screens/Scans/ScanDetailScreen'
import NewScanScreen from './screens/Scans/NewScanScreen'
import TargetsScreen from './screens/Targets/TargetsScreen'
import AlertsScreen from './screens/Alerts/AlertsScreen'
import SettingsScreen from './screens/Settings/SettingsScreen'
import ProfileScreen from './screens/Profile/ProfileScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

// Main Tab Navigator
const MainTabs = () => {
  const { theme } = useTheme()
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName
          
          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'view-dashboard' : 'view-dashboard-outline'
              break
            case 'Scans':
              iconName = focused ? 'radar' : 'radar'
              break
            case 'Targets':
              iconName = focused ? 'target' : 'target'
              break
            case 'Alerts':
              iconName = focused ? 'bell' : 'bell-outline'
              break
            case 'Settings':
              iconName = focused ? 'cog' : 'cog-outline'
              break
          }
          
          return <Icon name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Scans" component={ScansScreen} />
      <Tab.Screen name="Targets" component={TargetsScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  )
}

// Root Navigator
const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return null // Or splash screen
  }
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen 
            name="ScanDetail" 
            component={ScanDetailScreen}
            options={{ headerShown: true, title: 'Scan Details' }}
          />
          <Stack.Screen 
            name="NewScan" 
            component={NewScanScreen}
            options={{ headerShown: true, title: 'New Scan' }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{ headerShown: true, title: 'Profile' }}
          />
        </>
      )}
    </Stack.Navigator>
  )
}

// Main App Component
const App = () => {
  const isDarkMode = useColorScheme() === 'dark'
  
  return (
    <ReduxProvider store={store}>
      <ThemeProvider>
        <AuthProvider>
          <PaperProvider>
            <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </PaperProvider>
        </AuthProvider>
      </ThemeProvider>
    </ReduxProvider>
  )
}

export default App
