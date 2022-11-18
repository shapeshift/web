import { CHAIN_NAMESPACE, CHAIN_REFERENCE, fromChainId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { WalletConnectCallRequest } from './bridge/types'
import { WalletConnectBridge } from './bridge/WalletConnectBridge'
import { CallRequestModal } from './components/modal/callRequest/CallRequestModal'
import { WalletConnectBridgeContext } from './WalletConnectBridgeContext'

export const WalletConnectBridgeProvider: FC<PropsWithChildren> = ({ children }) => {
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const [bridge, setBridge] = useState<WalletConnectBridge>()
  const { supportedEvmChainIds, connectedEvmChainId } = useEvm()
  const ethChainId = useMemo(
    () =>
      connectedEvmChainId
        ? fromChainId(connectedEvmChainId).chainReference
        : CHAIN_REFERENCE.EthereumMainnet,
    [connectedEvmChainId],
  )
  const chainName = useMemo(() => {
    const name = getChainAdapterManager()
      .get(
        supportedEvmChainIds.find(chainId => chainId === `${CHAIN_NAMESPACE.Evm}:${ethChainId}`) ??
          '',
      )
      ?.getDisplayName()

    return name ?? translate('plugins.walletConnectToDapps.header.menu.unsupportedNetwork')
  }, [ethChainId, supportedEvmChainIds, translate])

  const assets = useAppSelector(selectAssets)
  // will generalize for all evm chains
  const accountExplorerAddressLink = useMemo(() => {
    if (!ethChainId) return ''
    const chainId = `eip155:${ethChainId}`
    const feeAssetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
    if (!feeAssetId) return ''
    const asset = assets[feeAssetId]
    if (!asset) return ''
    return asset.explorerAddressLink
  }, [assets, ethChainId])

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
    async (uri: string, account: string | null) => {
      if (!wallet || !supportsETH(wallet)) return

      const newBridge = WalletConnectBridge.fromURI(
        uri,
        wallet,
        connectedEvmChainId
          ? fromChainId(connectedEvmChainId).chainReference
          : CHAIN_REFERENCE.EthereumMainnet,
        account,
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
    const existingBridge = WalletConnectBridge.fromSession(
      session,
      wallet,
      connectedEvmChainId
        ? fromChainId(connectedEvmChainId).chainReference
        : CHAIN_REFERENCE.EthereumMainnet,
      null,
      {
        onCallRequest,
      },
    )
    existingBridge.connector.on('connect', rerender)
    existingBridge.connector.on('disconnect', disconnect)
    await existingBridge.connect()
    setBridge(existingBridge)
  }, [bridge, wallet, connectedEvmChainId, onCallRequest, rerender, disconnect])

  // if connectedEvmChainId or wallet changes, update the walletconnect session
  useEffect(() => {
    if (connectedEvmChainId && bridge && dapp && wallet && supportsETH(wallet))
      bridge.updateSession({ chainId: fromChainId(connectedEvmChainId).chainReference, wallet })
    // we want to only look for chainId or wallet changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedEvmChainId, wallet])

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
        ethChainId,
        accountExplorerAddressLink,
      }}
    >
      {children}
      <CallRequestModal callRequest={callRequests[0]} />
    </WalletConnectBridgeContext.Provider>
  )
}
