import { WCService } from 'kkdesktop/walletconnect'
import type { WalletConnectCallRequest } from 'kkdesktop/walletconnect/types'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useWallet } from 'hooks/useWallet/useWallet'

import { CallRequestModal } from './components/modal/callRequest/CallRequestModal'
import type { TxData } from './components/modal/callRequest/SendTransactionConfirmation'
import { WalletConnectBridgeContext } from './WalletConnectBridgeContext'

export const WalletConnectBridgeProvider: FC<PropsWithChildren> = ({ children }) => {
  const wallet = useWallet().state.wallet
  const [bridge, setBridge] = useState<WCService>()

  const [callRequests, setCallRequests] = useState<WalletConnectCallRequest[]>([])
  const onCallRequest = useCallback(
    (request: WalletConnectCallRequest) => setCallRequests(prev => [...prev, request]),
    [],
  )
  const approveRequest = useCallback(
    async (request: WalletConnectCallRequest, txData: TxData) => {
      await bridge?.approveRequest(request, txData)
      setCallRequests(prev => prev.filter(req => req.id !== request.id))
    },
    [bridge],
  )
  const rejectRequest = useCallback(
    async (request: WalletConnectCallRequest) => {
      await bridge?.rejectRequest(request)
      setCallRequests(prev => prev.filter(req => req.id !== request.id))
    },
    [bridge],
  )

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

      const newBridge = WCService.fromURI(uri, wallet, { onCallRequest })
      newBridge.connector.on('connect', rerender)
      newBridge.connector.on('disconnect', disconnect)
      await newBridge.connect()
      setBridge(newBridge)
    },
    [wallet, disconnect, rerender, onCallRequest],
  )

  const tryConnectingToExistingSession = useCallback(async () => {
    if (!!bridge) return
    if (!wallet || !('_supportsETH' in wallet)) return

    const wcSessionJsonString = localStorage.getItem('walletconnect')
    if (!wcSessionJsonString) {
      return
    }

    const session = JSON.parse(wcSessionJsonString)
    const existingBridge = WCService.fromSession(session, wallet, { onCallRequest })
    existingBridge.connector.on('connect', rerender)
    existingBridge.connector.on('disconnect', disconnect)
    await existingBridge.connect()
    setBridge(existingBridge)
  }, [bridge, wallet, disconnect, rerender, onCallRequest])

  useEffect(() => {
    tryConnectingToExistingSession()
  }, [tryConnectingToExistingSession])

  const dapp = bridge?.connector.peerMeta ?? undefined

  return (
    <WalletConnectBridgeContext.Provider
      value={{ bridge, dapp, callRequests, connect, disconnect, approveRequest, rejectRequest }}
    >
      {children}
      <CallRequestModal callRequest={callRequests[0]} />
    </WalletConnectBridgeContext.Provider>
  )
}
