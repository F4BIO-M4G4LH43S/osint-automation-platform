import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { v4 as uuidv4 } from 'uuid'

class OfflineManager {
  constructor() {
    this.syncQueueKey = '@osint_sync_queue'
    this.cacheKey = '@osint_cache'
    this.isOnline = true
    
    this.initNetworkListener()
  }

  initNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline
      this.isOnline = state.isConnected && state.isInternetReachable
      
      if (wasOffline && this.isOnline) {
        // Came back online - trigger sync
        this.processSyncQueue()
      }
    })
  }

  // Queue operations for when online
  async queueOperation(operation) {
    const queueItem = {
      id: uuidv4(),
      operation: operation.type, // 'create_scan', 'update_target', etc.
      data: operation.data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 3
    }

    try {
      const existingQueue = await this.getSyncQueue()
      existingQueue.push(queueItem)
      await AsyncStorage.setItem(this.syncQueueKey, JSON.stringify(existingQueue))
      
      // Try to sync immediately if online
      if (this.isOnline) {
        this.processSyncQueue()
      }
      
      return queueItem.id
    } catch (error) {
      console.error('Failed to queue operation:', error)
      throw error
    }
  }

  async getSyncQueue() {
    try {
      const queue = await AsyncStorage.getItem(this.syncQueueKey)
      return queue ? JSON.parse(queue) : []
    } catch {
      return []
    }
  }

  async processSyncQueue() {
    const queue = await this.getSyncQueue()
    
    if (queue.length === 0) return

    console.log(`Processing ${queue.length} queued operations...`)
    
    const failedOperations = []
    
    for (const item of queue) {
      try {
        await this.executeOperation(item)
        console.log(`✓ Synced operation ${item.id}`)
      } catch (error) {
        console.error(`✗ Failed to sync operation ${item.id}:`, error)
        
        if (item.retries < item.maxRetries) {
          item.retries++
          item.lastError = error.message
          failedOperations.push(item)
        } else {
          // Max retries reached - notify user
          this.notifySyncFailure(item)
        }
      }
    }

    // Save failed operations back to queue
    await AsyncStorage.setItem(this.syncQueueKey, JSON.stringify(failedOperations))
    
    if (failedOperations.length === 0) {
      this.notifySyncComplete()
    }
  }

  async executeOperation(item) {
    // Import API dynamically to avoid circular dependencies
    const { scansApi, targetsApi } = require('./api')
    
    switch (item.operation) {
      case 'create_scan':
        return await scansApi.create(item.data)
      case 'update_target':
        return await targetsApi.update(item.data.id, item.data.updates)
      case 'delete_scan':
        return await scansApi.delete(item.data.id)
      default:
        throw new Error(`Unknown operation: ${item.operation}`)
    }
  }

  // Caching for offline access
  async cacheData(key, data, ttlMinutes = 60) {
    const cacheItem = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + (ttlMinutes * 60 * 1000)
    }
    
    try {
      const existingCache = await this.getCache()
      existingCache[key] = cacheItem
      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(existingCache))
    } catch (error) {
      console.error('Failed to cache data:', error)
    }
  }

  async getCachedData(key) {
    try {
      const cache = await this.getCache()
      const item = cache[key]
      
      if (!item) return null
      
      // Check if expired
      if (Date.now() > item.expiresAt) {
        delete cache[key]
        await AsyncStorage.setItem(this.cacheKey, JSON.stringify(cache))
        return null
      }
      
      return item.data
    } catch {
      return null
    }
  }

  async getCache() {
    try {
      const cache = await AsyncStorage.getItem(this.cacheKey)
      return cache ? JSON.parse(cache) : {}
    } catch {
      return {}
    }
  }

  // Specific cache methods for common data
  async cacheDashboardStats(stats) {
    await this.cacheData('dashboard_stats', stats, 5) // 5 minute TTL
  }

  async getCachedDashboardStats() {
    return await this.getCachedData('dashboard_stats')
  }

  async cacheScans(scans) {
    await this.cacheData('scans_list', scans, 10)
  }

  async getCachedScans() {
    return await this.getCachedData('scans_list')
  }

  async cacheScanDetail(scanId, scan) {
    await this.cacheData(`scan_${scanId}`, scan, 15)
  }

  async getCachedScanDetail(scanId) {
    return await this.getCachedData(`scan_${scanId}`)
  }

  // Offline-aware API wrapper
  async fetchWithOfflineSupport(apiCall, cacheKey, options = {}) {
    const { ttl = 60, fallbackToCache = true } = options
    
    try {
      // Try network first if online
      if (this.isOnline) {
        const data = await apiCall()
        
        // Cache successful response
        if (cacheKey) {
          await this.cacheData(cacheKey, data, ttl)
        }
        
        return { data, fromCache: false }
      }
    } catch (error) {
      console.log('Network request failed, trying cache...')
    }

    // Fallback to cache
    if (fallbackToCache && cacheKey) {
      const cached = await this.getCachedData(cacheKey)
      
      if (cached) {
        return { data: cached, fromCache: true }
      }
    }

    throw new Error('No network connection and no cached data available')
  }

  // Queue a scan for creation when online
  async queueScan(scanData) {
    // Store locally first
    const localScan = {
      ...scanData,
      id: `local_${uuidv4()}`,
      status: 'queued',
      created_at: new Date().toISOString(),
      isLocal: true
    }
    
    // Add to pending scans
    const pendingScans = await this.getPendingScans()
    pendingScans.push(localScan)
    await AsyncStorage.setItem('@osint_pending_scans', JSON.stringify(pendingScans))
    
    // Queue for sync
    await this.queueOperation({
      type: 'create_scan',
      data: scanData
    })
    
    return localScan
  }

  async getPendingScans() {
    try {
      const scans = await AsyncStorage.getItem('@osint_pending_scans')
      return scans ? JSON.parse(scans) : []
    } catch {
      return []
    }
  }

  // Notifications
  notifySyncComplete() {
    // Trigger local notification or event
    console.log('All data synced successfully')
  }

  notifySyncFailure(item) {
    console.error(`Operation ${item.id} failed permanently`)
    // Could trigger notification to user
  }

  // Clear all data (for logout)
  async clearAllData() {
    await AsyncStorage.multiRemove([
      this.syncQueueKey,
      this.cacheKey,
      '@osint_pending_scans'
    ])
  }
}

export default new OfflineManager()
