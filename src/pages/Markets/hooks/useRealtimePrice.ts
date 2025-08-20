import type { AssetId } from '@shapeshiftoss/caip'
import { adapters } from '@shapeshiftoss/caip'
import { useEffect, useMemo, useRef, useState } from 'react'

import { getConfig } from '@/config'

// Shared internal hook containing all WebSocket logic
function useRealtimePricesInternal(assetIds: AssetId[]) {
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  // Filter supported assets and get CoinCap slugs
  const { supportedAssets, coincapSlugs } = useMemo(() => {
    const supported: AssetId[] = []
    const slugs: string[] = []

    assetIds.forEach(id => {
      const slug = adapters.assetIdToCoinCap(id)
      if (slug) {
        supported.push(id)
        slugs.push(slug)
      }
    })

    return {
      supportedAssets: supported,
      coincapSlugs: slugs,
    }
  }, [assetIds])

  useEffect(() => {
    if (coincapSlugs.length === 0) return

    const baseUrl = getConfig().VITE_COINCAP_WS_BASE_URL

    if (!baseUrl) {
      setError('CoinCap WebSocket base URL not configured')
      return
    }

    const url = `${baseUrl}?assets=${coincapSlugs.join(',')}`
    const socket = new WebSocket(url)
    socketRef.current = socket

    socket.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    socket.onmessage = event => {
      try {
        const { data } = JSON.parse(event.data)
        setPrices(prev => {
          const updated = { ...prev }
          // Map CoinCap slugs back to assetIds
          supportedAssets.forEach(assetId => {
            const slug = adapters.assetIdToCoinCap(assetId)
            if (slug && data[slug]) {
              updated[assetId] = data[slug]
            }
          })
          return updated
        })
      } catch (e) {
        console.warn('Failed to parse WebSocket price data:', e)
      }
    }

    socket.onclose = () => {
      setIsConnected(false)
    }

    socket.onerror = () => {
      setError('WebSocket connection failed')
      setIsConnected(false)
    }

    return () => {
      socket.close()
    }
  }, [coincapSlugs, supportedAssets])

  const disconnect = () => {
    socketRef.current?.close()
  }

  return {
    prices,
    isConnected,
    error,
    disconnect,
    supportedAssets,
  }
}

export function useRealtimePrice(assetId: AssetId) {
  const assetIdArr = useMemo(() => [assetId], [assetId])
  const { prices, isConnected, error, disconnect, supportedAssets } =
    useRealtimePricesInternal(assetIdArr)

  return {
    price: prices[assetId] || null,
    isConnected,
    error,
    disconnect,
    isSupported: supportedAssets.includes(assetId),
  }
}

export function useRealtimePrices(assetIds: AssetId[]) {
  // Stabilize array reference to prevent unnecessary reconnections
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableAssetIds = useMemo(() => assetIds.slice().sort(), [assetIds.join(',')])
  return useRealtimePricesInternal(stableAssetIds)
}
