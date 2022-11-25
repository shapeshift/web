import { useToast } from '@chakra-ui/react'
import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import LegacyWalletConnect from '@walletconnect/client'
import { WCService } from 'kkdesktop/walletconnect'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'

import { CallRequestModal } from './components/modal/callRequest/CallRequestModal'
import { WalletConnectBridgeContext } from './WalletConnectBridgeContext'
import { getWalletConnect } from 'kkdesktop/walletconnect/utils'

export const WalletConnectBridgeProvider: FC<PropsWithChildren> = ({ children }) => {
  const wallet = useWallet().state.wallet
  const [bridge, setBridge] = useState<WCService>()

  const [requests, setRequests] = useState<any[]>([])
  const addRequest = useCallback((req: any) => setRequests(requests.concat(req)), [requests])
  const removeRequest = useCallback(
    (id: number) => {
      const newRequests = requests.filter(request => request.id !== id)
      delete newRequests[id]
      setRequests(newRequests)
    },
    [requests],
  )

  const [, setTick] = useState(0)
  const rerender = useCallback(() => setTick(prev => prev + 1), [])

  const toast = useToast()

  // connects to given URI or attempts previous connection
  const connect = useCallback(
    async (uri?: string) => {
      let newBridge
      if (uri) {
        const wc = await getWalletConnect(uri)
        newBridge = new WCService(wallet as ETHWallet, wc, {
          onCallRequest: addRequest,
        })
      }
      else {
        const wcSessionJsonString = localStorage.getItem('walletconnect')
        if (!wcSessionJsonString) return
        const session = JSON.parse(wcSessionJsonString)
        newBridge = new WCService(wallet as ETHWallet, new LegacyWalletConnect({ session }), {
          onCallRequest: addRequest,
        })
      }
      newBridge.connector.off('connect')
      newBridge.connector.off('disconnect')
      newBridge.connector.off('wallet_switchEthereumChain')
      newBridge.connector.on('connect', rerender)
      newBridge.connector.on('disconnect', rerender)
      newBridge.connector.on('wallet_switchEthereumChain', (_, e) => {
        toast({
          title: 'Wallet Connect',
          description: `Switched to chainId ${e.params[0].chainId}`,
          isClosable: true,
        })
        rerender()
      })
      await newBridge.connect()
      setBridge(newBridge)
    },
    [wallet, addRequest, rerender, toast],
  )

  useEffect(() => {
    connect()
  }, [connect])

  const dapp = bridge?.connector.peerMeta ?? undefined

  return (
    <WalletConnectBridgeContext.Provider value={{ bridge, dapp, connect, removeRequest, requests }}>
      {children}
      {requests.length > 0 && <CallRequestModal />}
    </WalletConnectBridgeContext.Provider>
  )
}
