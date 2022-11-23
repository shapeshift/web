import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds, toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { WalletConnectHDWallet } from '@shapeshiftoss/hdwallet-walletconnect'
import WalletConnect from '@walletconnect/client'
import type { IClientMeta, IWalletConnectSession } from '@walletconnect/types'
import { convertHexToUtf8 } from '@walletconnect/utils'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { isSome } from 'lib/utils'
import {
  selectAssets,
  selectPortfolioAccountMetadata,
  selectWalletAccountIds,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type {
  WalletConnectCallRequest,
  WalletConnectCallRequestResponseMap,
  WalletConnectSessionRequest,
  WalletConnectSessionRequestPayload,
} from './bridge/types'
import { CallRequestModal } from './components/modal/callRequest/CallRequestModal'
import { WalletConnectBridgeContext } from './WalletConnectBridgeContext'

const moduleLogger = logger.child({ namespace: ['WalletConnectBridge'] })

const bridge = 'https://bridge.walletconnect.org'

export const WalletConnectBridgeProvider: FC<PropsWithChildren> = ({ children }) => {
  const translate = useTranslate()
  const toast = useToast()
  const {
    state: { wallet, isDemoWallet },
  } = useWallet()
  const [callRequest, setCallRequest] = useState<WalletConnectCallRequest | undefined>()
  const [wcAccountId, setWcAccountId] = useState<AccountId | undefined>()
  const [connector, setConnector] = useState<WalletConnect | undefined>()
  const [dapp, setDapp] = useState<IClientMeta | null>(null)
  const { supportedEvmChainIds, connectedEvmChainId } = useEvm()
  const accountMetadataById = useAppSelector(selectPortfolioAccountMetadata)
  const walletAccountIds = useAppSelector(selectWalletAccountIds)
  const evmChainId = useMemo(() => connectedEvmChainId ?? ethChainId, [connectedEvmChainId])
  const chainName = useMemo(() => {
    const name = getChainAdapterManager()
      .get(supportedEvmChainIds.find(chainId => chainId === evmChainId) ?? '')
      ?.getDisplayName()

    return name ?? translate('plugins.walletConnectToDapps.header.menu.unsupportedNetwork')
  }, [evmChainId, supportedEvmChainIds, translate])

  const assets = useAppSelector(selectAssets)

  // will generalize for all evm chains
  const accountExplorerAddressLink = useMemo(() => {
    if (!evmChainId) return ''
    const feeAssetId = getChainAdapterManager().get(evmChainId)?.getFeeAssetId()
    if (!feeAssetId) return ''
    const asset = assets[feeAssetId]
    if (!asset) return ''
    return asset.explorerAddressLink
  }, [assets, evmChainId])

  const signMessage = useCallback(
    async (message: string) => {
      if (!message) return
      if (!wallet) return
      if (!wcAccountId) return
      const accountMetadata = accountMetadataById[wcAccountId]
      if (!accountMetadata) return
      const { bip44Params } = accountMetadata
      const addressNList = toAddressNList(bip44Params)
      const payload = { addressNList, message }
      // TODO(0xdef1cafe): delet
      const signedMessage = (await (wallet as ETHWallet).ethSignMessage(payload))?.signature
      if (!signedMessage) throw new Error('EvmBaseAdapter: error signing message')
      return signedMessage
    },
    [accountMetadataById, wallet, wcAccountId],
  )

  const handleSessionRequest = useCallback(
    (error: Error | null, payload: WalletConnectSessionRequestPayload) => {
      if (error) moduleLogger.error(error, { fn: '_onSessionRequest' }, 'Error session request')
      if (!connector) return
      if (!wcAccountId) return
      const { chainId, account } = fromAccountId(wcAccountId)
      moduleLogger.info(payload, 'approve wc session')
      connector.approveSession({
        chainId: parseInt(fromChainId(chainId).chainReference),
        accounts: [account],
      })
    },
    [connector, wcAccountId],
  )

  const approveRequest = useCallback(
    async (
      request: WalletConnectCallRequest,
      approveData: Partial<
        WalletConnectCallRequestResponseMap[keyof WalletConnectCallRequestResponseMap]
      >,
    ) => {
      if (!wallet) return
      if (!wcAccountId) return
      if (!connector) return

      // console.info(request, approveData);

      const maybeChainAdapter = getChainAdapterManager().get(fromAccountId(wcAccountId).chainId)
      if (!maybeChainAdapter) return
      const chainAdapter = maybeChainAdapter as unknown as EvmBaseAdapter<EvmChainId>

      // TODO(0xdef1cafe): IIFE
      let result: any
      switch (request.method) {
        case 'eth_sign': {
          result = await signMessage(convertHexToUtf8(request.params[1]))
          break
        }
        case 'eth_signTypedData': {
          result = await signMessage(request.params[1])
          break
        }
        case 'personal_sign': {
          result = await signMessage(convertHexToUtf8(request.params[0]))
          break
        }
        case 'eth_sendTransaction': {
          const tx = request.params[0]
          const { bip44Params } = accountMetadataById[wcAccountId]
          const { txToSign } = await chainAdapter.buildSendTransaction({
            ...tx,
            wallet,
            bip44Params,
            chainSpecific: {
              gasLimit: tx.gas,
              gasPrice: tx.gasPrice,
            },
          })
          // console.info(request, txToSign, approveData)
          try {
            result = await (async () => {
              if (wallet.supportsOfflineSigning()) {
                // console.info('here')
                const signedTx = await chainAdapter.signTransaction({
                  txToSign,
                  wallet,
                })
                // console.info(signedTx)
                return chainAdapter.broadcastTransaction(signedTx)
              } else if (wallet.supportsBroadcast()) {
                return chainAdapter.signAndBroadcastTransaction({ txToSign, wallet })
              } else {
                throw new Error('Bad hdwallet config')
              }
            })()
          } catch (error) {
            // console.error(error)
            moduleLogger.error(error, { fn: 'eth_sendTransaction' }, 'Error sending transaction')
          }
          break
        }
        case 'eth_signTransaction': {
          const tx = request.params[0]
          const addressNList = toAddressNList(accountMetadataById[wcAccountId].bip44Params)
          result = await chainAdapter.signTransaction({
            txToSign: {
              addressNList,
              chainId: parseInt(fromAccountId(wcAccountId).chainReference),
              data: tx.data,
              gasLimit: tx.gas,
              nonce: tx.nonce,
              to: tx.to,
              value: tx.value,
              ...approveData,
            },
            wallet,
          })
          break
        }
        default:
          break
      }
      if (result) {
        connector.approveRequest({ id: request.id, result })
        setCallRequest(undefined)
      } else {
        const message = 'JSON RPC method not supported'
        connector.rejectRequest({ id: request.id, error: { message } })
        setCallRequest(undefined)
      }
    },
    [wallet, wcAccountId, connector, signMessage, accountMetadataById],
  )

  const rejectRequest = useCallback(
    (request: WalletConnectCallRequest) => {
      const payload = { error: { message: 'User rejected request' }, id: request.id }
      connector?.rejectRequest(payload)
      setCallRequest(undefined)
    },
    [connector],
  )

  // const handleSessionUpdate = useCallback(
  //   (...args: any) => {
  //     if (!connector) return
  //     if (!wcAccountId) return
  //     const { chainId, account: address } = fromAccountId(wcAccountId)
  //     const chainAdapter = getChainAdapterManager().get(chainId)
  //     if (!chainAdapter) return
  //     // connector.updateSession({
  //     //   chainId: parseInt(fromChainId(chainId).chainReference),
  //     //   accounts: [address],
  //     // })
  //   },
  //   [connector, wcAccountId],
  // )

  const handleDisconnect = useCallback(() => {
    connector?.off('session_request')
    connector?.off('session_update')
    connector?.off('connect')
    connector?.off('disconnect')
    connector?.off('call_request')
    try {
      connector?.killSession()
    } catch (e) {
      moduleLogger.error(e, { fn: 'handleDisconnect' }, 'Error killing session')
    }
    setDapp(null)
    setConnector(undefined)
    localStorage.removeItem('walletconnect')
  }, [connector])

  // if evmChainId or wallet changes, update the walletconnect session
  useEffect(() => {
    // only care if we have an active bridge
    if (connector && dapp && wallet) {
      /**
       * if evmChainId changes, we change the session chainId
       * if the wallet changes, we gotta make sure new wallet supports eth,
       * and also supports offline signing.
       *
       * disconnect from the dapp if wallet does not meet the requirements
       */
      if (evmChainId && supportsETH(wallet) && wcAccountId && wallet.supportsOfflineSigning()) {
        const chainReference = fromChainId(evmChainId).chainReference
        const chainId = parseInt(chainReference)
        const accounts = [fromAccountId(wcAccountId).account]
        connector.updateSession({ chainId, accounts })
      } else {
        handleDisconnect()
      }
    }
    // we want to only look for chainId or wallet changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evmChainId, wallet])

  const handleConnect = useCallback(
    (err: Error | null, payload: { params: [{ peerMeta: IClientMeta }] }) => {
      if (err) moduleLogger.error(err, { fn: 'handleConnect' }, 'Error connecting')
      moduleLogger.info(payload, { fn: 'handleConnect' }, 'Payload')
      setDapp(payload.params[0].peerMeta)
    },
    [],
  )

  // incoming ws message, render the modal by setting the call request
  // then approve or reject based on user inputs.
  const handleCallRequest = useCallback((err: Error | null, request: WalletConnectCallRequest) => {
    if (err) {
      moduleLogger.error(err, { fn: 'handleCallRequest' }, 'Error handling call request')
    }
    setCallRequest(request)
  }, [])

  const handleWcSessionRequest = useCallback(
    (err: Error | null, request: WalletConnectSessionRequest) => {
      if (err) {
        moduleLogger.error(err, { fn: 'handleWcSessionRequest' }, 'Error handling session request')
      }
      moduleLogger.info(request, { fn: 'handleWcSessionRequest' }, 'handleWcSessionRequest')
    },
    [],
  )

  const handleWcSessionUpdate = useCallback(
    (err: Error | null, payload: any) => {
      if (err) {
        moduleLogger.error(err, 'handleWcSessionUpdate')
      }
      moduleLogger.info('handleWcSessionUpdate', payload)
      if (!payload?.params?.[0]?.accounts) handleDisconnect()
    },
    [handleDisconnect],
  )

  useEffect(() => {
    if (!connector) return
    connector.on('session_request', handleSessionRequest)
    // connector.on('session_update', handleSessionUpdate)
    connector.on('connect', handleConnect)
    connector.on('disconnect', handleDisconnect)
    connector.on('call_request', handleCallRequest)
    connector.on('wc_sessionRequest', handleWcSessionRequest)
    connector.on('wc_sessionUpdate', handleWcSessionUpdate)
  }, [
    connector,
    handleCallRequest,
    handleConnect,
    handleDisconnect,
    handleSessionRequest,
    // handleSessionUpdate,
    handleWcSessionRequest,
    handleWcSessionUpdate,
  ])

  /**
   * cold initialize from URI
   */
  const fromURI = useCallback(
    (uri: string): { successful: boolean } | void => {
      if (!wcAccountId) return
      localStorage.removeItem('walletconnect') // purge any old sessions
      try {
        const c = new WalletConnect({ bridge, uri })
        setConnector(c)
        return { successful: true }
      } catch (error) {
        moduleLogger.error(error, { fn: 'fromURI' }, 'Error connecting with uri')
        const duration = 2500
        const isClosable = true
        const toastPayload = { duration, isClosable }
        const title = translate('plugins.walletConnectToDapps.modal.connect.connectionError')
        const status = 'error'
        toast({ title, status, ...toastPayload })
      }
    },
    [toast, translate, wcAccountId],
  )

  /**
   * initialize from existing session via local storage
   */
  const fromSession = useCallback((session: IWalletConnectSession) => {
    const c = new WalletConnect({ bridge, session })
    setConnector(c)
    return c
  }, [])

  /**
   * handle wallet switch
   */
  useEffect(() => {
    if (!wallet) return
    /**
     * we are both a dapp, and a wallet
     * they share the same connector, and it's hard to distinguish events
     * for now, disallow conencting to shapeshift via walletconnect, and
     * also using shapeshift as a wallet to connect to dapps
     */
    if (wallet instanceof WalletConnectHDWallet) return
    if (!walletAccountIds.length) return
    const walletEvmAddresses = Array.from(
      new Set(
        walletAccountIds
          .map(accountId => {
            const { chainId, account } = fromAccountId(accountId)
            if (!evmChainIds.includes(chainId as EvmChainId)) return undefined
            return account
          })
          .filter(isSome),
      ),
    )

    const wcSessionJsonString = localStorage.getItem('walletconnect')
    if (!wcSessionJsonString) return
    const session = JSON.parse(wcSessionJsonString)
    const wcAddress: string | undefined = (session?.accounts ?? [])[0]
    const isMissingWcAddress = !wcAddress
    const isDifferentWallet = wcAddress && !walletEvmAddresses.includes(wcAddress)
    const isNotOfflineSigningWallet = !wallet.supportsOfflineSigning()
    if (isDifferentWallet || isNotOfflineSigningWallet || isMissingWcAddress) handleDisconnect()
  }, [handleDisconnect, wallet, walletAccountIds])

  const maybeHydrateSession = useCallback(() => {
    if (isDemoWallet) return
    if (!wallet) return
    if (wallet instanceof WalletConnectHDWallet) return
    if (connector) return
    const wcSessionJsonString = localStorage.getItem('walletconnect')
    if (!wcSessionJsonString) return
    const session = JSON.parse(wcSessionJsonString)
    fromSession(session)
    const d = session?.peerMeta
    if (d) setDapp(d)
  }, [connector, fromSession, isDemoWallet, wallet])

  /**
   * public method for consumers
   */
  const connect = useCallback((uri: string) => fromURI(uri), [fromURI])

  /**
   * reconnect on mount
   */
  useEffect(() => {
    maybeHydrateSession()
  })

  return (
    <WalletConnectBridgeContext.Provider
      value={{
        connector,
        dapp,
        connect,
        disconnect: handleDisconnect,
        approveRequest,
        rejectRequest,
        chainName,
        evmChainId,
        accountExplorerAddressLink,
        wcAccountId,
        setWcAccountId,
      }}
    >
      {children}
      <CallRequestModal callRequest={callRequest} />
    </WalletConnectBridgeContext.Provider>
  )
}
