import { useQuery } from '@tanstack/react-query'
import noop from 'lodash/noop'
import { useCallback, useMemo } from 'react'

import { useUser } from '@/hooks/useUser/useUser'
import { WebSocketManager, WebSocketServiceType } from '@/lib/websocket/WebSocketManager'
import type { WebSocketEventHandler } from '@/lib/websocket/WebSocketService'

// Use Vite proxy paths for WebSocket connections
const SWAPS_SERVER_URL = import.meta.env.VITE_SWAPS_SERVER_URL
const NOTIFICATIONS_SERVER_URL = import.meta.env.VITE_NOTIFICATIONS_SERVER_URL

type UseWebSocketReturn = {
  isConnected: boolean
  isLoading: boolean
  error: Error | null
  on: (event: string, handler: WebSocketEventHandler) => () => void
  off: (event: string, handler?: WebSocketEventHandler) => void
  emit: (event: string, data: unknown) => void
  reconnect: () => void
  connectedServices: WebSocketServiceType[]
}

type UseWebSocketOptions = {
  serviceType: WebSocketServiceType
}

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const { serviceType } = options
  const { user, isLoading: isLoadingUser } = useUser()

  const { isLoading, error, refetch } = useQuery({
    queryKey: ['websocket', serviceType, user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User ID is required for WebSocket connection')
      }

      const manager = WebSocketManager.getInstance({
        userId: user.id,
        services: {
          [WebSocketServiceType.Swaps]: {
            serverUrl: SWAPS_SERVER_URL || '',
            enabled: !!SWAPS_SERVER_URL,
          },
          [WebSocketServiceType.Notifications]: {
            serverUrl: NOTIFICATIONS_SERVER_URL || '',
            enabled: !!NOTIFICATIONS_SERVER_URL,
          },
        },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
      })

      await manager.connect(serviceType)
      return manager
    },
    enabled: !!user?.id && !isLoadingUser,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  const getManager = useCallback((): WebSocketManager | null => {
    if (!user?.id) {
      return null
    }

    try {
      return WebSocketManager.getInstance({
        userId: user.id,
        services: {
          [WebSocketServiceType.Swaps]: {
            serverUrl: SWAPS_SERVER_URL || '',
            enabled: !!SWAPS_SERVER_URL,
          },
          [WebSocketServiceType.Notifications]: {
            serverUrl: NOTIFICATIONS_SERVER_URL || '',
            enabled: !!NOTIFICATIONS_SERVER_URL,
          },
        },
      })
    } catch {
      return null
    }
  }, [user?.id])

  const on = useCallback(
    (event: string, handler: WebSocketEventHandler): (() => void) => {
      const manager = getManager()
      if (!manager) {
        console.warn(`Cannot add listener for "${event}": WebSocket not configured`)
        return noop
      }

      try {
        return manager.on(serviceType, event, handler)
      } catch (error) {
        console.warn(`Cannot add listener for "${event}":`, error)
        return noop
      }
    },
    [getManager, serviceType],
  )

  const off = useCallback(
    (event: string, handler?: WebSocketEventHandler): void => {
      const manager = getManager()
      if (!manager) {
        return
      }

      try {
        manager.off(serviceType, event, handler)
      } catch (error) {
        console.warn(`Cannot remove listener for "${event}":`, error)
      }
    },
    [getManager, serviceType],
  )

  const emit = useCallback(
    (event: string, data: unknown): void => {
      const manager = getManager()
      if (!manager) {
        console.warn(`Cannot emit event "${event}": WebSocket not configured`)
        return
      }

      try {
        manager.emit(serviceType, event, data)
      } catch (error) {
        console.error(`Failed to emit event "${event}":`, error)
      }
    },
    [getManager, serviceType],
  )

  const reconnect = useCallback(() => {
    const manager = getManager()
    if (manager) {
      manager.reconnect(serviceType).catch(console.error)
    }
    refetch()
  }, [getManager, serviceType, refetch])

  const isConnected = useMemo(() => {
    const manager = getManager()
    return manager?.isConnected(serviceType) ?? false
  }, [getManager, serviceType])

  const connectedServices = useMemo(() => {
    const manager = getManager()
    return manager?.getConnectedServices() ?? []
  }, [getManager])

  return {
    isConnected,
    isLoading,
    error,
    on,
    off,
    emit,
    reconnect,
    connectedServices,
  }
}
