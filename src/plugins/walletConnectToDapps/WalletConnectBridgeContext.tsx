import { HDWalletWCBridge } from '@shapeshiftoss/hdwallet-walletconnect-bridge'
import type { FC, PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'

type WalletConnectBridgeContextValue = {
  bridge: HDWalletWCBridge | undefined
  connect(uri: string): Promise<void>
  disconnect(): Promise<void>
}

const WalletConnectBridgeContext = createContext<WalletConnectBridgeContextValue>({
  bridge: undefined,
  connect: Promise.resolve,
  disconnect: Promise.resolve,
})

export const WalletConnectBridgeProvider: FC<PropsWithChildren> = ({ children }) => {
  const wallet = useWallet().state.wallet
  const [bridge, setBridge] = useState<HDWalletWCBridge>()

  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick(prev => prev + 1), [])

  const disconnect = useCallback(async () => {
    await bridge?.disconnect()
    setBridge(undefined)
  }, [bridge])

  const connect = useCallback(
    async (uri: string) => {
      if (!wallet) {
        alert('TODO: No HDWallet connected')
        return
      }
      if (!('_supportsETH' in wallet)) {
        alert('TODO: No ETH HDWallet connected')
        return
      }

      const newBridge = HDWalletWCBridge.fromURI(uri, wallet)
      newBridge.connector.on('connect', rerender)
      newBridge.connector.on('disconnect', disconnect)
      await newBridge.connect()
      setBridge(newBridge)
    },
    [wallet, disconnect, rerender],
  )

  const tryConnectingToExistingSession = useCallback(async () => {
    if (!wallet || !('_supportsETH' in wallet)) return

    const wcSessionJsonString = localStorage.getItem('walletconnect')
    if (!wcSessionJsonString) {
      return
    }

    const session = JSON.parse(wcSessionJsonString)
    const existingBridge = HDWalletWCBridge.fromSession(session, wallet)
    existingBridge.connector.on('connect', rerender)
    existingBridge.connector.on('disconnect', disconnect)
    await existingBridge.connect()
    setBridge(existingBridge)
  }, [wallet, disconnect, rerender])

  useEffect(() => {
    tryConnectingToExistingSession()
  }, [tryConnectingToExistingSession])

  return (
    <WalletConnectBridgeContext.Provider value={{ bridge, connect, disconnect }}>
      {children}
    </WalletConnectBridgeContext.Provider>
  )
}

export function useWalletConnect() {
  return useContext(WalletConnectBridgeContext)
}
