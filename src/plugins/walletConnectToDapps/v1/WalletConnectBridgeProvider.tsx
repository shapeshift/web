import { useToast } from '@chakra-ui/react'
import type { AccountId, ChainId, ChainReference } from '@shapeshiftoss/caip'
import {
  assertIsChainReference,
  CHAIN_NAMESPACE,
  CHAIN_REFERENCE,
  ethChainId,
  fromAccountId,
  fromChainId,
  toAccountId,
  toChainId,
} from '@shapeshiftoss/caip'
import type { EvmChainId } from '@shapeshiftoss/chain-adapters'
import { evmChainIds } from '@shapeshiftoss/chain-adapters'
import { WalletConnectHDWallet } from '@shapeshiftoss/hdwallet-walletconnect'
import WalletConnect from '@walletconnect/client'
import type { IClientMeta, IUpdateChainParams } from '@walletconnect/legacy-types'
import { useIsWalletConnectToDappsSupportedWallet } from 'plugins/walletConnectToDapps/hooks/useIsWalletConnectToDappsSupportedWallet'
import { convertHexToNumber } from 'plugins/walletConnectToDapps/utils'
import type {
  WalletConnectCallRequest,
  WalletConnectSessionRequest,
  WalletConnectSessionRequestPayload,
} from 'plugins/walletConnectToDapps/v1/bridge/types'
import type { ConfirmData } from 'plugins/walletConnectToDapps/v1/components/modals/callRequest/CallRequestCommon'
import { CallRequestModal } from 'plugins/walletConnectToDapps/v1/components/modals/callRequest/CallRequestModal'
import { useApprovalHandler } from 'plugins/walletConnectToDapps/v1/useApprovalHandler'
import { WalletConnectBridgeContext } from 'plugins/walletConnectToDapps/v1/WalletConnectBridgeContext'
import type { FC, PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useEvm } from 'hooks/useEvm/useEvm'
import { useWallet } from 'hooks/useWallet/useWallet'
import { rpcUrlByChainId } from 'lib/ethersProviderSingleton'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { isSome } from 'lib/utils'
import {
  selectAssets,
  selectFeeAssetByChainId,
  selectWalletAccountIds,
} from 'state/slices/selectors'
import { store, useAppSelector } from 'state/store'

const bridge = 'https://bridge.walletconnect.org'

export const WalletConnectBridgeProvider: FC<PropsWithChildren> = ({ children }) => {
  const translate = useTranslate()
  const toast = useToast()
  const wallet = useWallet().state.wallet
  const isWalletConnectToDappsSupportedWallet = useIsWalletConnectToDappsSupportedWallet()
  const [callRequest, setCallRequest] = useState<WalletConnectCallRequest | undefined>()
  const [wcAccountId, setWcAccountId] = useState<AccountId | undefined>()
  const [connector, setConnector] = useState<WalletConnect | undefined>()
  const [dapp, setDapp] = useState<IClientMeta | null>(null)
  const { supportedEvmChainIds } = useEvm()
  const [connectedEvmChainId, setConnectedEvmChainId] = useState<ChainId>(ethChainId)
  const { eth_signTransaction, eth_sendTransaction, eth_signTypedData, personal_sign, eth_sign } =
    useApprovalHandler(wcAccountId)

  const walletAccountIds = useAppSelector(selectWalletAccountIds)
  const evmChainId = useMemo(() => connectedEvmChainId ?? ethChainId, [connectedEvmChainId])
  const chainName = useMemo(() => {
    const name = getChainAdapterManager()
      .get(supportedEvmChainIds.find(chainId => chainId === connectedEvmChainId) ?? '')
      ?.getDisplayName()

    return name ?? translate('plugins.walletConnectToDapps.header.menu.unsupportedNetwork')
  }, [connectedEvmChainId, supportedEvmChainIds, translate])

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

  const handleSessionRequest = useCallback(
    (error: Error | null, payload: WalletConnectSessionRequestPayload) => {
      if (error) console.error(error)
      if (!connector || !wcAccountId) return
      const { account } = fromAccountId(wcAccountId)
      // evm chain id integers (chain references in caip parlance, chainId in EVM parlance)
      const supportedEvmChainReferenceInts = evmChainIds.map(chainId =>
        parseInt(fromChainId(chainId).chainReference),
      )

      const candidateChainIdRaw = payload.params[0].chainId
      const candidateChainIdInt =
        // Apotheosis: In the wild I've seen both hex and decimal representations of chainId provided in the payload
        typeof candidateChainIdRaw === 'string'
          ? convertHexToNumber(candidateChainIdRaw)
          : candidateChainIdRaw

      // some dapps don't send a chainId - default to eth mainnet
      if (supportedEvmChainReferenceInts.includes(candidateChainIdInt) || !candidateChainIdInt) {
        connector.approveSession({
          chainId: candidateChainIdInt ?? parseInt(CHAIN_REFERENCE.EthereumMainnet),
          accounts: [account],
        })
        const connectedEvmChain = toChainId({
          chainNamespace: CHAIN_NAMESPACE.Evm,
          chainReference: candidateChainIdInt.toString() as ChainReference,
        })
        setConnectedEvmChainId(connectedEvmChain)
      } else {
        connector.rejectSession()
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

  const approveRequest = useCallback(
    async (request: WalletConnectCallRequest, approveData: ConfirmData) => {
      if (!connector) return

      const result = await (() => {
        switch (request.method) {
          case 'eth_sign':
            return eth_sign(request)
          case 'eth_signTypedData':
          case 'eth_signTypedData_v4':
            return eth_signTypedData(request)
          case 'eth_sendTransaction':
            return eth_sendTransaction(request, approveData)
          case 'eth_signTransaction':
            return eth_signTransaction(request, approveData)
          case 'personal_sign':
            return personal_sign(request)
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

  const handleSessionUpdate = useCallback((_args: unknown) => {}, [])

  const handleDisconnect = useCallback(async () => {
    connector?.off('session_request')
    connector?.off('session_update')
    connector?.off('connect')
    connector?.off('disconnect')
    connector?.off('call_request')
    connector?.off('wc_sessionRequest')
    connector?.off('wc_sessionUpdate')
    connector?.off('wallet_switchEthereumChain')
    try {
      await connector?.killSession()
    } catch (e) {
      console.error(e)
    }
    setDapp(null)
    setConnector(undefined)
    localStorage.removeItem('walletconnect')
  }, [connector])

  const handleConnect = useCallback(
    (err: Error | null, payload: { params: [{ peerMeta: IClientMeta }] }) => {
      if (err) console.error(err)
      const dapp = payload.params[0].peerMeta
      setDapp(dapp)
      getMixPanel()?.track(MixPanelEvents.ConnectedTodApp, dapp)
    },
    [],
  )

  // incoming ws message, render the modal by setting the call request
  // then approve or reject based on user inputs.
  const handleCallRequest = useCallback((err: Error | null, request: WalletConnectCallRequest) => {
    err ? console.error(err) : setCallRequest(request)
  }, [])

  const handleWcSessionRequest = useCallback(
    (err: Error | null, _request: WalletConnectSessionRequest) => {
      err && console.error(err)
    },
    [],
  )

  const handleWcSessionUpdate = useCallback(
    (err: Error | null, payload: any) => {
      if (err) console.error(err)
      if (!payload?.params?.[0]?.accounts) handleDisconnect()
    },
    [handleDisconnect],
  )

  const handleSwitchChain = useCallback(
    (err: Error | null, payload: any) => {
      if (err) return console.error(err)
      if (!wcAccountId) return console.error('No account id found for wallet connect')
      const walletConnectChainIdHex = payload.params[0].chainId
      const chainReference = parseInt(walletConnectChainIdHex, 16).toString()
      assertIsChainReference(chainReference)
      const chainId = toChainId({ chainNamespace: CHAIN_NAMESPACE.Evm, chainReference })
      const state = store.getState()
      const feeAsset = selectFeeAssetByChainId(state, chainId)
      if (!feeAsset) return console.error('No fee asset found for chainId', chainId)
      const selectedAccount = fromAccountId(wcAccountId).account
      const accountIdOnNewChain = toAccountId({ chainId, account: selectedAccount })
      const updateChainParams: IUpdateChainParams = {
        chainId: walletConnectChainIdHex, // chain reference as hex
        networkId: parseInt(chainReference),
        rpcUrl: rpcUrlByChainId(chainId),
        nativeCurrency: { name: feeAsset.name, symbol: feeAsset.symbol },
      }
      setWcAccountId(accountIdOnNewChain)
      setConnectedEvmChainId(chainId)
      connector?.updateChain(updateChainParams)
      connector?.updateSession({
        chainId: parseInt(chainReference), // chain reference as integer
        accounts: [fromAccountId(accountIdOnNewChain).account], // our implementation only supports one connected account per chain
        networkId: parseInt(chainReference),
        rpcUrl: rpcUrlByChainId(chainId),
      })
    },
    [connector, wcAccountId],
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
    connector.on('wallet_switchEthereumChain', handleSwitchChain)
  }, [
    connector,
    handleCallRequest,
    handleConnect,
    handleDisconnect,
    handleSessionRequest,
    handleSessionUpdate,
    handleSwitchChain,
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
        console.error(error)
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
     * e.g. we had a ShapeShift wallet connected, and we were connected to a dapp
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
