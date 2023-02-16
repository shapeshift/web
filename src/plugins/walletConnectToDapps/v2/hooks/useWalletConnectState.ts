import { useIsInteractingWithContract } from 'plugins/walletConnectToDapps/hooks/useIsInteractingWithContract'
import {
  extractConnectedAccounts,
  getSignParamsMessage,
  getWalletAccountFromParams,
  getWalletAddressFromParams,
} from 'plugins/walletConnectToDapps/utils'
import type {
  EIP155_SigningMethod,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/v2/types'
import { isSignRequest, isSignTypedRequest } from 'plugins/walletConnectToDapps/v2/types'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectPortfolioAccountMetadata } from 'state/slices/portfolioSlice/selectors'
import { useAppSelector } from 'state/store'

export const useWalletConnectState = (state: WalletConnectState) => {
  const { modalData, session } = state
  const requestEvent = modalData?.requestEvent

  const params = requestEvent?.params
  const request = params?.request
  const chainId = params?.chainId
  const transactionParams = request?.params
  const transaction = transactionParams?.[0]

  const connectedAccounts = extractConnectedAccounts(session)
  const address = getWalletAddressFromParams(connectedAccounts, params)

  const accountMetadataById = useAppSelector(selectPortfolioAccountMetadata)
  const accountId = getWalletAccountFromParams(connectedAccounts, requestEvent?.params)
  const accountMetadata = accountMetadataById[accountId]

  const isInteractingWithContract = useIsInteractingWithContract({
    evmChainId: chainId ?? '',
    address,
  })

  const message =
    request && (isSignRequest(request) || isSignTypedRequest(request))
      ? getSignParamsMessage(request.params)
      : undefined
  const method: EIP155_SigningMethod | undefined = requestEvent?.params.request.method
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
