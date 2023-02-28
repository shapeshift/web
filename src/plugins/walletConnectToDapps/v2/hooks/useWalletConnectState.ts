import { CHAIN_NAMESPACE, fromChainId } from '@shapeshiftoss/caip'
import { useIsInteractingWithContract } from 'plugins/walletConnectToDapps/hooks/useIsInteractingWithContract'
import {
  extractConnectedAccounts,
  getSignParamsMessage,
  getWalletAccountFromCosmosParams,
  getWalletAccountFromEthParams,
  getWalletAddressFromEthSignParams,
} from 'plugins/walletConnectToDapps/utils'
import {
  isEthSignParams,
  isSignRequest,
  isSignTypedRequest,
  isTransactionParamsArray,
} from 'plugins/walletConnectToDapps/v2/typeGuards'
import type { KnownSigningMethod, WalletConnectState } from 'plugins/walletConnectToDapps/v2/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectPortfolioAccountMetadata } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

/*
  A helper hook to derive commonly used information from the WalletConnectState
 */
export const useWalletConnectState = (state: WalletConnectState) => {
  const { modalData, session } = state
  const requestEvent = modalData?.requestEvent

  const params = requestEvent?.params
  const request = params?.request
  // Unlike V1, V2 uses CAIP2 standards strings
  const chainId = params?.chainId
  const requestParams = request?.params
  const transaction = isTransactionParamsArray(requestParams) ? requestParams?.[0] : undefined

  const connectedAccounts = extractConnectedAccounts(session)

  const address = (() => {
    if (requestParams && isEthSignParams(requestParams))
      return getWalletAddressFromEthSignParams(connectedAccounts, requestParams)
    if (requestParams && isTransactionParamsArray(requestParams)) return requestParams[0].from
    if (requestParams) return requestParams.signerAddress
    else return undefined
  })()

  const accountMetadataById = useAppSelector(selectPortfolioAccountMetadata)

  const accountId = (() => {
    if (
      requestParams &&
      (isEthSignParams(requestParams) || isTransactionParamsArray(requestParams))
    )
      return getWalletAccountFromEthParams(connectedAccounts, requestParams)
    if (requestParams) return getWalletAccountFromCosmosParams(connectedAccounts, requestParams)
    else return undefined
  })()

  const accountMetadata = accountId ? accountMetadataById[accountId] : undefined

  const isEvmChain = chainId && fromChainId(chainId).chainNamespace === CHAIN_NAMESPACE.Evm
  const isInteractingWithContract = useIsInteractingWithContract({
    evmChainId: isEvmChain ? chainId : undefined,
    address,
  })

  const message =
    request && (isSignRequest(request) || isSignTypedRequest(request))
      ? getSignParamsMessage(request.params)
      : undefined
  const method: KnownSigningMethod | undefined = requestEvent?.params.request.method
  const chainAdapter = chainId && getChainAdapterManager().get(chainId)

  return {
    isInteractingWithContract,
    address,
    transaction,
    message,
    method,
    chainAdapter,
    requestEvent,
    connectedAccounts,
    accountId,
    accountMetadata,
    chainId,
  }
}
