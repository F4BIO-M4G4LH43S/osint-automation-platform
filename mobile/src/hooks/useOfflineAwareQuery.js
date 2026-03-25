import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'
import offlineManager from '../services/offlineManager'

export const useOfflineAwareQuery = (key, apiCall, options = {}) => {
  const [isOnline, setIsOnline] = useState(true)
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected && state.isInternetReachable)
    })
    
    return () => unsubscribe()
  }, [])

  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const cacheKey = Array.isArray(key) ? key.join('_') : key
      
      const result = await offlineManager.fetchWithOfflineSupport(
        apiCall,
        cacheKey,
        { ttl: options.cacheTtl || 60, fallbackToCache: true }
      )
      
      return result.data
    },
    ...options,
    // Show stale data while refetching
    staleTime: options.staleTime || 5 * 60 * 1000, // 5 minutes
  })
}

export const useOfflineMutation = (mutationFn, options = {}) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables) => {
      // If offline, queue for later
      const netInfo = await NetInfo.fetch()
      
      if (!netInfo.isConnected) {
        const queueId = await offlineManager.queueOperation({
          type: options.operationType || 'generic',
          data: variables
        })
        
        // Return optimistic response
        return {
          queued: true,
          queueId,
          message: 'Operation queued for sync'
        }
      }
      
      // Online - execute normally
      return await mutationFn(variables)
    },
    onSuccess: (data, variables, context) => {
      if (!data.queued) {
        // Normal success handling
        options.onSuccess?.(data, variables, context)
        queryClient.invalidateQueries(options.invalidateQueries)
      } else {
        // Queued for later
        console.log('Operation queued:', data.queueId)
      }
    },
    ...options
  })
}
