import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Button, Card, Title, Paragraph } from 'react-native-paper'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

import biometrics from '../../services/biometrics'

const BiometricSetupScreen = () => {
  const navigation = useNavigation()
  const [biometricInfo, setBiometricInfo] = useState(null)
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkBiometricStatus()
  }, [])

  const checkBiometricStatus = async () => {
    try {
      const info = await biometrics.isAvailable()
      const enabled = await biometrics.isBiometricLoginEnabled()
      
      setBiometricInfo(info)
      setIsEnabled(enabled)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnable = async () => {
    try {
      setLoading(true)
      await biometrics.enableBiometricLogin()
      setIsEnabled(true)
      Alert.alert(
        'Success',
        'Biometric authentication has been enabled',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      )
    } catch (error) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    Alert.alert(
      'Disable Biometric Login',
      'Are you sure you want to disable biometric authentication?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true)
              await biometrics.disableBiometricLogin()
              setIsEnabled(false)
            } catch (error) {
              Alert.alert('Error', error.message)
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (!biometricInfo?.available) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content style={styles.centeredContent}>
            <Icon name="fingerprint-off" size={64} color="#9ca3af" />
            <Title style={styles.title}>Not Available</Title>
            <Paragraph style={styles.description}>
              Biometric authentication is not available on this device. 
              Please ensure you have set up {biometricInfo?.typeName || 'biometrics'} 
              in your device settings.
            </Paragraph>
          </Card.Content>
        </Card>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.iconContainer}>
            <Icon 
              name={biometricInfo.type === 'FaceID' ? 'face-recognition' : 'fingerprint'} 
              size={64} 
              color="#3b82f6" 
            />
          </View>
          
          <Title style={styles.title}>
            {biometricInfo.typeName}
          </Title>
          
          <Paragraph style={styles.description}>
            Use {biometricInfo.typeName} for quick and secure access to your 
            OSINT Platform account. Your biometric data never leaves your device.
          </Paragraph>

          <View style={styles.benefitsContainer}>
            <BenefitItem 
              icon="lightning-bolt" 
              text="Faster login - no typing required" 
            />
            <BenefitItem 
              icon="shield-check" 
              text="Enhanced security" 
            />
            <BenefitItem 
              icon="lock" 
              text="Data stays on your device" 
            />
          </View>

          {isEnabled ? (
            <Button
              mode="outlined"
              onPress={handleDisable}
              style={styles.button}
              color="#ef4444"
            >
              Disable {biometricInfo.typeName}
            </Button>
          ) : (
            <Button
              mode="contained"
              onPress={handleEnable}
              style={styles.button}
            >
              Enable {biometricInfo.typeName}
            </Button>
          )}
        </Card.Content>
      </Card>

      <Text style={styles.securityNote}>
        🔒 Your biometric data is stored securely on your device and is never 
        transmitted to our servers.
      </Text>
    </View>
  )
}

const BenefitItem = ({ icon, text }) => (
  <View style={styles.benefitItem}>
    <Icon name={icon} size={20} color="#10b981" />
    <Text style={styles.benefitText}>{text}</Text>
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f3f4f6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    elevation: 4,
  },
  centeredContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 24,
  },
  benefitsContainer: {
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  benefitText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
  },
  button: {
    marginTop: 8,
    paddingVertical: 8,
  },
  securityNote: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
    color: '#6b7280',
    paddingHorizontal: 20,
  },
})

export default BiometricSetupScreen
