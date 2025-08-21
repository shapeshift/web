import { useQuery } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

import { useManageUser } from '@/context/AppProvider/hooks/useManageUser'

interface WebSocketConfig {
  serverUrl: string
  userId: string
}

const createWebSocketConnection = (config: WebSocketConfig): Promise<Socket> => {
  return new Promise((resolve, reject) => {
    const socket = io(config.serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      console.log('WebSocket connected for user:', config.userId)

      socket.emit('authenticate', { userId: config.userId }, (response: any) => {
        if (response?.success) {
          console.log('Successfully registered to WebSocket')
          resolve(socket)
        } else {
          const error = new Error(response?.error || 'Failed to register to WebSocket')
          console.error('WebSocket registration failed:', error)
          reject(error)
        }
      })
    })

    socket.on('connect_error', error => {
      console.error('WebSocket connection error:', error)
      reject(error)
    })

    const timeout = setTimeout(() => {
      reject(new Error('WebSocket connection timeout'))
    }, 10000)

    socket.on('connect', () => {
      clearTimeout(timeout)
    })

    socket.on('connect_error', () => {
      clearTimeout(timeout)
    })
  })
}

const serverUrl = import.meta.env.VITE_SWAPS_SERVER_URL

export const useNotificationWebsocket = () => {
  const { user } = useManageUser()

  const {
    data: socket,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['websocket', user?.id],
    queryFn: () => {
      if (!user?.id || !serverUrl) {
        throw new Error('User ID or server URL not available')
      }
      return createWebSocketConnection({
        serverUrl,
        userId: user.id,
      })
    },
    enabled: !!user?.id && !!serverUrl,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })

  const addEventListener = (event: string, handler: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, handler)
      return () => socket.off(event, handler)
    }
    return () => {}
  }

  const removeEventListener = (event: string, handler: (...args: any[]) => void) => {
    if (socket) {
      socket.off(event, handler)
    }
  }

  const emit = (event: string, data: any) => {
    if (socket?.connected) {
      socket.emit(event, data)
    } else {
      console.warn('Cannot emit event: WebSocket not connected')
    }
  }

  return {
    socket,
    isLoading,
    error,
    refetch,
    isConnected: socket?.connected ?? false,
    addEventListener,
    removeEventListener,
    emit,
    onNotification: (handler: (data: any) => void) => addEventListener('notification', handler),
    onSwapUpdate: (handler: (data: any) => void) => addEventListener('swap_update', handler),
    onConnect: (handler: () => void) => addEventListener('connect', handler),
    onDisconnect: (handler: (reason: string) => void) => addEventListener('disconnect', handler),
    onError: (handler: (error: Error) => void) => addEventListener('error', handler),
  }
}
