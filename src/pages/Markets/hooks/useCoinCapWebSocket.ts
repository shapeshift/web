import { useEffect, useMemo, useRef, useState } from 'react'

import { getConfig } from '@/config'

interface UseCoinCapWebSocketOptions {
  assets: string[]
  onPriceUpdate?: (data: Record<string, string>) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

export function useCoinCapWebSocket({
  assets,
  onPriceUpdate,
  onConnect,
  onDisconnect,
  onError,
}: UseCoinCapWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)

  // Store latest handlers in refs
  const handlersRef = useRef({ onPriceUpdate, onConnect, onDisconnect, onError })
  handlersRef.current = { onPriceUpdate, onConnect, onDisconnect, onError }

  // Stabilize assets string to prevent unnecessary reconnections
  const assetsString = useMemo(() => assets.join(','), [assets])

  useEffect(() => {
    const baseUrl = getConfig().VITE_COINCAP_WS_BASE_URL
    const url = `${baseUrl}?assets=${assetsString}`
    const socket = new WebSocket(url)
    socketRef.current = socket

    socket.onopen = () => {
      setIsConnected(true)
      handlersRef.current.onConnect?.()
    }

    socket.onmessage = event => {
      const data = JSON.parse(event.data)
      handlersRef.current.onPriceUpdate?.(data)
    }

    socket.onclose = () => {
      setIsConnected(false)
      handlersRef.current.onDisconnect?.()
    }

    socket.onerror = error => {
      handlersRef.current.onError?.(error)
    }

    return () => {
      socket.close()
    }
  }, [assetsString])

  const disconnect = () => {
    socketRef.current?.close()
  }

  return { isConnected, disconnect }
}
