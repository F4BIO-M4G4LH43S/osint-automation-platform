// mobile/src/services/notifications.js
import PushNotification from 'react-native-push-notification'
import PushNotificationIOS from '@react-native-community/push-notification-ios'
import { Platform } from 'react-native'
import { notificationsApi } from './api'

class NotificationService {
  constructor() {
    this.configure()
  }

  configure() {
    PushNotification.configure({
      // Called when token is generated
      onRegister: (token) => {
        console.log('Push Token:', token)
        this.registerToken(token.token)
      },

      // Called when notification is received
      onNotification: (notification) => {
        console.log('Notification:', notification)
        
        // Handle notification
        if (notification.userInteraction) {
          // User tapped notification
          this.handleNotificationTap(notification)
        }

        // Required for iOS
        notification.finish(PushNotificationIOS.FetchResult.NoData)
      },

      // Permissions
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      popInitialNotification: true,
      requestPermissions: true,
    })

    // Create notification channel for Android
    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'osint-alerts',
          channelName: 'OSINT Security Alerts',
          channelDescription: 'Critical security findings and scan completions',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Channel created: ${created}`)
      )

      PushNotification.createChannel(
        {
          channelId: 'osint-general',
          channelName: 'OSINT General',
          channelDescription: 'General notifications and updates',
          playSound: false,
          importance: 3,
        },
        (created) => console.log(`Channel created: ${created}`)
      )
    }
  }

  async registerToken(token) {
    try {
      await notificationsApi.registerPushToken(token)
    } catch (error) {
      console.error('Failed to register push token:', error)
    }
  }

  handleNotificationTap(notification) {
    // Navigate based on notification type
    const { data } = notification
    
    switch (data?.type) {
      case 'scan_complete':
        // Navigate to scan detail
        break
      case 'critical_finding':
        // Navigate to finding detail
        break
      case 'target_down':
        // Navigate to target status
        break
      default:
        // Navigate to dashboard
    }
  }

  // Local notification for scan completion
  showScanComplete(scanId, target) {
    PushNotification.localNotification({
      channelId: 'osint-alerts',
      title: 'Scan Complete',
      message: `Scan for ${target} has finished`,
      playSound: true,
      soundName: 'default',
      userInfo: { type: 'scan_complete', scanId },
    })
  }

  // Local notification for critical finding
  showCriticalFinding(target, severity, finding) {
    PushNotification.localNotification({
      channelId: 'osint-alerts',
      title: `🚨 Critical Finding: ${target}`,
      message: `${severity}: ${finding}`,
      playSound: true,
      soundName: 'default',
      vibrate: true,
      vibration: 300,
      userInfo: { type: 'critical_finding', target },
    })
  }

  // Schedule daily summary
  scheduleDailySummary(time = '09:00') {
    const [hours, minutes] = time.split(':')
    
    PushNotification.localNotificationSchedule({
      channelId: 'osint-general',
      title: 'Daily Security Summary',
      message: 'Your daily OSINT summary is ready',
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      repeatType: 'day',
      repeatTime: { hour: parseInt(hours), minute: parseInt(minutes) },
    })
  }

  cancelAll() {
    PushNotification.cancelAllLocalNotifications()
  }
}

export default new NotificationService()
