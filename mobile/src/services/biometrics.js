import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics'
import AsyncStorage from '@react-native-async-storage/async-storage'

class BiometricAuth {
  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics()
  }

  async isAvailable() {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable()
      return {
        available,
        type: biometryType, // BiometryTypes.TouchID, FaceID, Biometrics
        typeName: this.getBiometryName(biometryType)
      }
    } catch (error) {
      console.error('Biometric check failed:', error)
      return { available: false, type: null, typeName: null }
    }
  }

  getBiometryName(type) {
    switch (type) {
      case BiometryTypes.TouchID:
        return 'Touch ID'
      case BiometryTypes.FaceID:
        return 'Face ID'
      case BiometryTypes.Biometrics:
        return 'Biometric Authentication'
      default:
        return 'Unknown'
    }
  }

  async createKeys() {
    try {
      const { publicKey } = await this.rnBiometrics.createKeys()
      await AsyncStorage.setItem('biometric_public_key', publicKey)
      return publicKey
    } catch (error) {
      throw new Error('Failed to create biometric keys: ' + error.message)
    }
  }

  async deleteKeys() {
    try {
      await this.rnBiometrics.deleteKeys()
      await AsyncStorage.removeItem('biometric_public_key')
      return true
    } catch (error) {
      console.error('Failed to delete keys:', error)
      return false
    }
  }

  async promptLogin(promptMessage = 'Authenticate to access OSINT Platform') {
    try {
      const { success, signature } = await this.rnBiometrics.simplePrompt({
        promptMessage,
        cancelButtonText: 'Cancel'
      })
      
      return success
    } catch (error) {
      console.error('Biometric prompt failed:', error)
      return false
    }
  }

  async promptWithCrypto(payload = 'osint-auth-payload') {
    try {
      // Create signature
      const { success, signature } = await this.rnBiometrics.createSignature({
        promptMessage: 'Sign in with biometrics',
        payload: payload + Date.now() // Add timestamp for uniqueness
      })

      if (success) {
        // Verify signature on server or locally
        return { success: true, signature }
      }
      
      return { success: false, error: 'User cancelled' }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  async enableBiometricLogin() {
    const { available } = await this.isAvailable()
    
    if (!available) {
      throw new Error('Biometric authentication not available on this device')
    }

    // Test prompt to ensure user has enrolled biometrics
    const testSuccess = await this.promptLogin('Please verify your identity to enable biometric login')
    
    if (!testSuccess) {
      throw new Error('Biometric verification failed')
    }

    // Create keys for future crypto operations
    await this.createKeys()
    
    // Store preference
    await AsyncStorage.setItem('biometric_login_enabled', 'true')
    
    return true
  }

  async disableBiometricLogin() {
    await this.deleteKeys()
    await AsyncStorage.removeItem('biometric_login_enabled')
    return true
  }

  async isBiometricLoginEnabled() {
    const enabled = await AsyncStorage.getItem('biometric_login_enabled')
    return enabled === 'true'
  }

  async authenticateWithBiometrics() {
    const isEnabled = await this.isBiometricLoginEnabled()
    
    if (!isEnabled) {
      return { success: false, error: 'Biometric login not enabled' }
    }

    const { available } = await this.isAvailable()
    
    if (!available) {
      return { success: false, error: 'Biometric hardware not available' }
    }

    const success = await this.promptLogin()
    
    if (success) {
      // Retrieve stored credentials or token
      const credentials = await this.getSecureCredentials()
      return { success: true, credentials }
    }

    return { success: false, error: 'Authentication failed' }
  }

  async storeSecureCredentials(credentials) {
    // Store encrypted credentials in keychain/keystore
    const jsonCredentials = JSON.stringify(credentials)
    // Implementation depends on keychain library
    // This is a simplified version
    await AsyncStorage.setItem('secure_credentials', jsonCredentials)
  }

  async getSecureCredentials() {
    const stored = await AsyncStorage.getItem('secure_credentials')
    return stored ? JSON.parse(stored) : null
  }

  // For high-security operations (e.g., deleting data, changing settings)
  async requireStrongAuth(promptMessage = 'Confirm your identity') {
    const { available, type } = await this.isAvailable()
    
    if (!available) {
      // Fall back to device PIN/password
      return this.promptDeviceCredential(promptMessage)
    }

    return this.promptLogin(promptMessage)
  }

  async promptDeviceCredential(promptMessage) {
    // Fallback to device credentials if biometrics unavailable
    try {
      const result = await this.rnBiometrics.simplePrompt({
        promptMessage,
        cancelButtonText: 'Cancel'
      })
      return result.success
    } catch (error) {
      return false
    }
  }
}

export default new BiometricAuth()
