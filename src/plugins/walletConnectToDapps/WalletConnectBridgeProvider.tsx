import { useToast } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { CHAIN_REFERENCE, ethChainId, fromAccountId, fromChainId } from '@shapeshiftoss/caip'
import type {
  EvmBaseAdapter,
  EvmChainId,
  FeeDataEstimate,
  FeeDataKey,
} from '@shapeshiftoss/chain-adapters'
import { evmChainIds, toAddressNList } from '@shapeshiftoss/chain-adapters'
import { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { WalletConnectHDWallet } from '@shapeshiftoss/hdwallet-walletconnect'
import type { EvmSupportedChainIds } from '@shapeshiftoss/swapper'
import WalletConnect from '@walletconnect/client'
import type { IClientMeta } from '@walletconnect/types'
import { convertHexToUtf8, convertNumberToHex } from '@walletconnect/utils'
import type { ethers } from 'ethers'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'
import { isSome } from 'lib/utils'
import {
  selectAssets,
  selectPortfolioAccountMetadata,
  selectWalletAccountIds,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type {
  TransactionParams,
  WalletConnectCallRequest,
  WalletConnectEthSendTransactionCallRequest,
  WalletConnectEthSignCallRequest,
  WalletConnectEthSignTransactionCallRequest,
  WalletConnectEthSignTypedDataCallRequest,
  WalletConnectPersonalSignCallRequest,
  WalletConnectSessionRequest,
  WalletConnectSessionRequestPayload,
} from './bridge/types'
import type { ConfirmData } from './components/modal/callRequest/CallRequestCommon'
import { CallRequestModal } from './components/modal/callRequest/CallRequestModal'
import { useIsWalletConnectToDappsSupportedWallet } from './hooks/useIsWalletConnectToDappsSupportedWallet'
import { WalletConnectBridgeContext } from './WalletConnectBridgeContext'

const moduleLogger = logger.child({ namespace: ['WalletConnectBridge'] })

const bridge = 'https://bridge.walletconnect.org'

const getFeesForTx = async (
  tx: TransactionParams,
  evmChainAdapter: EvmBaseAdapter<EvmChainId>,
  wcAccountId: AccountId,
) => {
  return await evmChainAdapter.getFeeData({
    to: tx.to,
    value: bnOrZero(tx.value).toFixed(0),
    chainSpecific: {
      from: fromAccountId(wcAccountId).account,
      contractAddress: tx.to,
      contractData: tx.data,
    },
  })
}

export const WalletConnectBridgeProvider: FC<PropsWithChildren> = ({ children }) => {
  const translate = useTranslate()
  const toast = useToast()
  const wallet = useWallet().state.wallet
  const isWalletConnectToDappsSupportedWallet = useIsWalletConnectToDappsSupportedWallet()
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
    async (message: string | ethers.utils.Bytes) => {
      if (!message) return
      if (!wallet) return
      if (!wcAccountId) return
      const { chainId } = fromAccountId(wcAccountId)
      const maybeChainAdapter = getChainAdapterManager().get(chainId)
      if (!maybeChainAdapter) return
      const chainAdapter = maybeChainAdapter as unknown as EvmBaseAdapter<EvmChainId>
      const accountMetadata = accountMetadataById[wcAccountId]
      if (!accountMetadata) return
      const { bip44Params } = accountMetadata
      const addressNList = toAddressNList(bip44Params)
      const messageToSign = { addressNList, message }
      const input = { messageToSign, wallet }
      const signedMessage = await chainAdapter.signMessage(input)
      if (!signedMessage) throw new Error('WalletConnectBridgeProvider: signMessage failed')
      return signedMessage
    },
    [accountMetadataById, wallet, wcAccountId],
  )

  const handleSessionRequest = useCallback(
    (error: Error | null, payload: WalletConnectSessionRequestPayload) => {
      if (error) moduleLogger.error(error, { fn: '_onSessionRequest' }, 'Error session request')
      if (!connector) return
      if (!wcAccountId) return
      const { account } = fromAccountId(wcAccountId)
      moduleLogger.info(payload, 'approve wc session')
      // evm chain id integers (chain references in caip parlance, chainId in EVM parlance)
      const supportedEvmChainReferenceInts = evmChainIds.map(chainId =>
        parseInt(fromChainId(chainId).chainReference),
      )
      const candidateChainIdInt = payload.params[0].chainId
      // some dapps don't send a chainId - default to eth mainnet
      if (supportedEvmChainReferenceInts.includes(candidateChainIdInt) || !candidateChainIdInt) {
        connector.approveSession({
          chainId: candidateChainIdInt ?? parseInt(CHAIN_REFERENCE.EthereumMainnet),
          accounts: [account],
        })
      } else {
        connector.rejectSession()
        moduleLogger.error(
          { chainId: candidateChainIdInt },
          'Unsupported chain id for wallet connect',
        )
        const supportedChainNames = evmChainIds
          .map(chainId => {
            return getChainAdapterManager().get(chainId)?.getDisplayName()
          })
          .join(', ')
        const duration = 3000
        const isClosable = true
        const title = translate('plugins.walletConnectToDapps.unsupportedToast.title')
        const description = translate('plugins.walletConnectToDapps.unsupportedToast.description', {
          supportedChainNames,
        })
        const status = 'error' as const
        const position = 'top-right' as const
        const toastPayload = { title, description, status, duration, isClosable, position }
        toast(toastPayload)
      }
    },
    [connector, translate, toast, wcAccountId],
  )

  const eth_sign = useCallback(
    async (request: WalletConnectEthSignCallRequest) => {
      return await signMessage(convertHexToUtf8(request.params[1]))
    },
    [signMessage],
  )

  const personal_sign = useCallback(
    async (request: WalletConnectPersonalSignCallRequest) => {
      return await signMessage(convertHexToUtf8(request.params[0]))
    },
    [signMessage],
  )

  const eth_signTypedData = useCallback(
    async (request: WalletConnectEthSignTypedDataCallRequest) => {
      const payloadString = request.params[1]
      const typedData = JSON.parse(payloadString)
      if (!typedData) return
      if (!wallet) return
      if (!wcAccountId) return
      const accountMetadata = accountMetadataById[wcAccountId]
      if (!accountMetadata) return
      const { bip44Params } = accountMetadata
      const addressNList = toAddressNList(bip44Params)
      const messageToSign = { addressNList, typedData }
      if (wallet instanceof KeepKeyHDWallet || wallet instanceof NativeHDWallet) {
        const signedMessage = await wallet?.ethSignTypedData(messageToSign)
        if (!signedMessage) throw new Error('WalletConnectBridgeProvider: signTypedData failed')
        return signedMessage.signature
      }
    },
    [accountMetadataById, wallet, wcAccountId],
  )

  const getGasData = useCallback(
    (approveData: ConfirmData, fees: FeeDataEstimate<EvmSupportedChainIds>) => {
      const { speed, customFee } = approveData
      return speed === 'custom' && customFee?.baseFee && customFee?.baseFee
        ? {
            maxPriorityFeePerGas: convertNumberToHex(
              bnOrZero(customFee.priorityFee).times(1e9).toString(), // to wei
            ),
            maxFeePerGas: convertNumberToHex(
              bnOrZero(customFee.baseFee).times(1e9).toString(), // to wei
            ),
          }
        : {
            gasPrice: convertNumberToHex(fees[speed as FeeDataKey].chainSpecific.gasPrice),
          }
    },
    [],
  )

  const eth_sendTransaction = useCallback(
    async (request: WalletConnectEthSendTransactionCallRequest, approveData: ConfirmData) => {
      if (!wallet) return
      if (!wcAccountId) return
      const maybeChainAdapter = getChainAdapterManager().get(fromAccountId(wcAccountId).chainId)
      if (!maybeChainAdapter) return
      const chainAdapter = maybeChainAdapter as unknown as EvmBaseAdapter<EvmChainId>
      const tx = request.params[0]
      const maybeAdvancedParamsNonce = approveData.nonce
        ? convertNumberToHex(approveData.nonce)
        : null
      const didUserChangeNonce = maybeAdvancedParamsNonce && maybeAdvancedParamsNonce !== tx.nonce
      const fees = await getFeesForTx(tx, chainAdapter, wcAccountId)
      const gasData = getGasData(approveData, fees)
      const { bip44Params } = accountMetadataById[wcAccountId]
      const { accountNumber } = bip44Params
      const { txToSign: txToSignWithPossibleWrongNonce } = await chainAdapter.buildCustomTx({
        wallet,
        accountNumber,
        to: tx.to,
        data: tx.data,
        value: tx.value ?? convertNumberToHex(0),
        gasLimit:
          (approveData.gasLimit ? convertNumberToHex(approveData.gasLimit) : tx.gas) ??
          convertNumberToHex(9000), // https://docs.walletconnect.com/1.0/json-rpc-api-methods/ethereum#eth_sendtransaction
        ...gasData,
      })
      const txToSign = {
        ...txToSignWithPossibleWrongNonce,
        nonce: didUserChangeNonce ? maybeAdvancedParamsNonce : txToSignWithPossibleWrongNonce.nonce,
      }
      try {
        return await (async () => {
          if (wallet.supportsOfflineSigning()) {
            const signedTx = await chainAdapter.signTransaction({
              txToSign,
              wallet,
            })
            return chainAdapter.broadcastTransaction(signedTx)
          } else if (wallet.supportsBroadcast()) {
            return chainAdapter.signAndBroadcastTransaction({ txToSign, wallet })
          } else {
            throw new Error('Bad hdwallet config')
          }
        })()
      } catch (error) {
        moduleLogger.error(
          error,
          { fn: 'approveRequest:eth_sendTransaction' },
          'Error sending transaction',
        )
      }
    },
    [accountMetadataById, getGasData, wallet, wcAccountId],
  )

  const eth_signTransaction = useCallback(
    async (request: WalletConnectEthSignTransactionCallRequest, approveData: ConfirmData) => {
      if (!wallet) return
      if (!wcAccountId) return
      const maybeChainAdapter = getChainAdapterManager().get(fromAccountId(wcAccountId).chainId)
      if (!maybeChainAdapter) return
      const chainAdapter = maybeChainAdapter as unknown as EvmBaseAdapter<EvmChainId>
      const tx = request.params[0]
      const addressNList = toAddressNList(accountMetadataById[wcAccountId].bip44Params)
      const nonce = approveData.nonce ? convertNumberToHex(approveData.nonce) : tx.nonce
      if (!nonce) return
      const gasLimit =
        (approveData.gasLimit ? convertNumberToHex(approveData.gasLimit) : tx.gas) ??
        convertNumberToHex(9000) // https://docs.walletconnect.com/1.0/json-rpc-api-methods/ethereum#eth_sendtransaction
      const fees = await getFeesForTx(tx, chainAdapter, wcAccountId)
      const gasData = getGasData(approveData, fees)
      return await chainAdapter.signTransaction({
        txToSign: {
          addressNList,
          chainId: parseInt(fromAccountId(wcAccountId).chainReference),
          data: tx.data,
          gasLimit,
          nonce,
          to: tx.to,
          value: tx.value ?? convertNumberToHex(0),
          ...gasData,
        },
        wallet,
      })
    },
    [accountMetadataById, getGasData, wallet, wcAccountId],
  )

  const approveRequest = useCallback(
    async (request: WalletConnectCallRequest, approveData: ConfirmData) => {
      if (!connector) return

      const result: any = await (async () => {
        switch (request.method) {
          case 'eth_sign':
            return await eth_sign(request)
          case 'eth_signTypedData':
            return await eth_signTypedData(request)
          case 'eth_sendTransaction':
            return await eth_sendTransaction(request, approveData)
          case 'eth_signTransaction':
            return await eth_signTransaction(request, approveData)
          case 'personal_sign':
            return await personal_sign(request)
          default:
            return
        }
      })()

      result
        ? connector.approveRequest({ id: request.id, result })
        : connector.rejectRequest({
            id: request.id,
            error: { message: 'JSON RPC method not supported' },
          })
      setCallRequest(undefined)
    },
    [
      connector,
      eth_sign,
      eth_signTypedData,
      eth_sendTransaction,
      eth_signTransaction,
      personal_sign,
    ],
  )

  const rejectRequest = useCallback(
    (request: WalletConnectCallRequest) => {
      const payload = { error: { message: 'User rejected request' }, id: request.id }
      connector?.rejectRequest(payload)
      setCallRequest(undefined)
    },
    [connector],
  )

  const handleSessionUpdate = useCallback((args: unknown) => {
    moduleLogger.info(args, 'handleSessionUpdate')
  }, [])

  const handleDisconnect = useCallback(async () => {
    connector?.off('session_request')
    connector?.off('session_update')
    connector?.off('connect')
    connector?.off('disconnect')
    connector?.off('call_request')
    try {
      await connector?.killSession()
    } catch (e) {
      moduleLogger.error(e, { fn: 'handleDisconnect' }, 'Error killing session')
    }
    setDapp(null)
    setConnector(undefined)
    localStorage.removeItem('walletconnect')
  }, [connector])

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
    err
      ? moduleLogger.error(err, { fn: 'handleCallRequest' }, 'Error handling call request')
      : setCallRequest(request)
  }, [])

  const handleWcSessionRequest = useCallback(
    (err: Error | null, request: WalletConnectSessionRequest) => {
      err
        ? moduleLogger.error(
            err,
            { fn: 'handleWcSessionRequest' },
            'Error handling session request',
          )
        : moduleLogger.info(request, { fn: 'handleWcSessionRequest' }, 'handleWcSessionRequest')
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
    connector.on('session_update', handleSessionUpdate)
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
    handleSessionUpdate,
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
   * handle wallet switch
   */
  useEffect(() => {
    if (!wallet) return
    if (!walletAccountIds.length) return
    /**
     * we are both a wallet, and a dapp. this is painful.
     *
     * if the wallet connected to us, as a dapp, is a walletconnect wallet,
     * we don't want to disconnect, as the walletconnect connector is
     * the same thing, whether we are acting as a dapp, or a wallet.
     *
     * e.g. we had a native wallet connected, and we were connected to a dapp
     * via walletconnect, and a user switches from native to walletconnect wallet.
     * hdwallet will overwrite the connector/session in local storage,
     * leave it alone, and let hdwallet manage it.
     */
    if (wallet instanceof WalletConnectHDWallet) return
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
    const isUnsupportedWallet = !isWalletConnectToDappsSupportedWallet
    const shouldDisconnect = isMissingWcAddress || isDifferentWallet || isUnsupportedWallet
    shouldDisconnect && handleDisconnect()
  }, [handleDisconnect, isWalletConnectToDappsSupportedWallet, wallet, walletAccountIds])

  /**
   * public method for consumers
   */
  const connect = useCallback((uri: string) => fromURI(uri), [fromURI])

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
