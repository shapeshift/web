import { useIsInteractingWithContract } from 'plugins/walletConnectToDapps/hooks/useIsInteractingWithContract'
import {
  extractConnectedAccounts,
  getSignParamsMessage,
  getWalletAccountFromEthParams,
  getWalletAddressFromEthSignParams,
} from 'plugins/walletConnectToDapps/utils'
import type {
  CosmosSigningMethod,
  EIP155_SigningMethod,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/v2/types'
import {
  isEthSignParams,
  isSignRequest,
  isSignTypedRequest,
  isTransactionParamsArray,
} from 'plugins/walletConnectToDapps/v2/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectPortfolioAccountMetadata } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

export const useWalletConnectState = (state: WalletConnectState) => {
  const { modalData, session } = state
  const requestEvent = modalData?.requestEvent

  const params = requestEvent?.params
  const request = params?.request
  const chainId = params?.chainId
  const requestParams = request?.params
  const transaction = isTransactionParamsArray(requestParams) ? requestParams?.[0] : undefined

  const connectedAccounts = extractConnectedAccounts(session)

  const address = (() => {
    if (requestParams && isEthSignParams(requestParams))
      return getWalletAddressFromEthSignParams(connectedAccounts, requestParams)
    if (requestParams && isTransactionParamsArray(requestParams)) return requestParams[0].from
    if (requestParams && isEthSignParams(requestParams)) return requestParams.signerAddress
    else return undefined
  })()

  const accountMetadataById = useAppSelector(selectPortfolioAccountMetadata)
  const accountId =
    requestParams && (isEthSignParams(requestParams) || isTransactionParamsArray(requestParams))
      ? getWalletAccountFromEthParams(connectedAccounts, requestParams)
      : undefined
  const accountMetadata = accountId ? accountMetadataById[accountId] : undefined

  const isInteractingWithContract = useIsInteractingWithContract({
    evmChainId: chainId,
    address,
  })

  const message =
    request && (isSignRequest(request) || isSignTypedRequest(request))
      ? getSignParamsMessage(request.params)
      : undefined
  const method: EIP155_SigningMethod | CosmosSigningMethod | undefined =
    requestEvent?.params.request.method
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
