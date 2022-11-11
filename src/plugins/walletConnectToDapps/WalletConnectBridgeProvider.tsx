import { CHAIN_NAMESPACE, CHAIN_REFERENCE, fromChainId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { WalletConnectCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge'
import { HDWalletWCBridge } from '@shapeshiftoss/hdwallet-walletconnect-bridge'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'

import { CallRequestModal } from './components/modal/callRequest/CallRequestModal'
import { WalletConnectBridgeContext } from './WalletConnectBridgeContext'

export const WalletConnectBridgeProvider: FC<PropsWithChildren> = ({ children }) => {
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const [bridge, setBridge] = useState<HDWalletWCBridge>()
  const { supportedEvmChainIds, connectedEvmChainId } = useEvm()
  const chainName = useMemo(() => {
    const name = getChainAdapterManager()
      .get(
        supportedEvmChainIds.find(
          chainId =>
            chainId ===
            `${CHAIN_NAMESPACE.Evm}:${
              connectedEvmChainId
                ? fromChainId(connectedEvmChainId).chainReference
                : CHAIN_REFERENCE.EthereumMainnet
            }`,
        ) ?? '',
      )
      ?.getDisplayName()

    return name ?? translate('plugins.walletConnectToDapps.header.menu.unsupportedNetwork')
  }, [connectedEvmChainId, supportedEvmChainIds, translate])

  const [callRequests, setCallRequests] = useState<WalletConnectCallRequest[]>([])
  const onCallRequest = useCallback(
    (request: WalletConnectCallRequest) => setCallRequests(prev => [...prev, request]),
    [],
  )
  const approveRequest = useCallback(
    async (request: WalletConnectCallRequest, approveData: unknown) => {
      await bridge?.approveRequest(request, approveData as any)
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

      if (!supportsETH(wallet)) {
        alert('TODO: No ETH HDWallet connected')
        return
      }

      const newBridge = HDWalletWCBridge.fromURI(
        uri,
        wallet,
        connectedEvmChainId
          ? fromChainId(connectedEvmChainId).chainReference
          : CHAIN_REFERENCE.EthereumMainnet,
        {
          onCallRequest,
        },
      )

      newBridge.connector.on('connect', rerender)
      newBridge.connector.on('disconnect', disconnect)
      await newBridge.connect()

      setBridge(newBridge)
    },
    [wallet, connectedEvmChainId, onCallRequest, rerender, disconnect],
  )

  const tryConnectingToExistingSession = useCallback(async () => {
    if (!!bridge) return
    if (!wallet || !supportsETH(wallet)) return

    const wcSessionJsonString = localStorage.getItem('walletconnect')
    if (!wcSessionJsonString) return

    const session = JSON.parse(wcSessionJsonString)
    const existingBridge = HDWalletWCBridge.fromSession(
      session,
      wallet,
      connectedEvmChainId
        ? fromChainId(connectedEvmChainId).chainReference
        : CHAIN_REFERENCE.EthereumMainnet,
      {
        onCallRequest,
      },
    )
    existingBridge.connector.on('connect', rerender)
    existingBridge.connector.on('disconnect', disconnect)
    await existingBridge.connect()
    setBridge(existingBridge)
  }, [bridge, wallet, connectedEvmChainId, onCallRequest, rerender, disconnect])

  // if connectedEvmChainId changes, update the walletconnect session
  useEffect(() => {
    if (connectedEvmChainId && bridge && dapp)
      bridge.updateSession({ chainId: fromChainId(connectedEvmChainId).chainReference })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedEvmChainId])

  // TODO(Q): fix the race condition between the following two hooks
  // if the wallet provider or connectedEvmChainId changes, disconnect the dapp
  // useEffect(() => {
  //   disconnect()
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [wallet, connectedEvmChainId])

  useEffect(() => {
    tryConnectingToExistingSession()
  }, [tryConnectingToExistingSession])

  const dapp = bridge?.connector.peerMeta ?? undefined

  return (
    <WalletConnectBridgeContext.Provider
      value={{
        bridge,
        dapp,
        callRequests,
        connect,
        disconnect,
        approveRequest,
        rejectRequest,
        chainName,
      }}
    >
      {children}
      <CallRequestModal callRequest={callRequests[0]} />
    </WalletConnectBridgeContext.Provider>
  )
}
