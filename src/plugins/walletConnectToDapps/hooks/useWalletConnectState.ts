import { useMemo } from 'react'

import {
  isEthSignParams,
  isSignRequest,
  isSignTypedRequest,
  isTransactionParamsArray,
} from '@/plugins/walletConnectToDapps/typeGuards'
import type { KnownSigningMethod, WalletConnectState } from '@/plugins/walletConnectToDapps/types'
import { SolanaSigningMethod } from '@/plugins/walletConnectToDapps/types'
import {
  extractAllConnectedAccounts,
  getSignParamsMessage,
  getWalletAccountFromCosmosParams,
  getWalletAccountFromEthParams,
  getWalletAccountFromSolanaParams,
  getWalletAddressFromEthSignParams,
} from '@/plugins/walletConnectToDapps/utils'
import { selectPortfolioAccountMetadata } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

const solanaSigningMethods: string[] = Object.values(SolanaSigningMethod)

const isSolanaMethod = (method: string | undefined): boolean =>
  method !== undefined && solanaSigningMethods.includes(method)

/*
  A helper hook to derive commonly used information from the WalletConnectState
 */
export const useWalletConnectState = (state: WalletConnectState) => {
  const { modalData, sessionsByTopic } = state
  const requestEvent = modalData?.requestEvent

  const params = requestEvent?.params
  const request = params?.request
  const method: KnownSigningMethod | undefined = request?.method
  // Unlike V1, V2 uses CAIP2 standards strings
  const chainId = params?.chainId
  const requestParams = request?.params
  const transaction = isTransactionParamsArray(requestParams) ? requestParams?.[0] : undefined

  const connectedAccounts = extractAllConnectedAccounts(sessionsByTopic)

  const address = useMemo(() => {
    if (requestParams && isEthSignParams(requestParams))
      return getWalletAddressFromEthSignParams(connectedAccounts, requestParams)
    if (requestParams && isTransactionParamsArray(requestParams)) return requestParams[0].from
    if (requestParams && 'signerAddress' in requestParams) return requestParams.signerAddress
    if (isSolanaMethod(method) && requestParams && 'pubkey' in requestParams)
      return requestParams.pubkey
    return undefined
  }, [connectedAccounts, method, requestParams])

  const accountMetadataById = useAppSelector(selectPortfolioAccountMetadata)

  const accountId = useMemo(() => {
    if (!chainId) return

    if (
      requestParams &&
      (isEthSignParams(requestParams) || isTransactionParamsArray(requestParams))
    )
      return getWalletAccountFromEthParams(connectedAccounts, requestParams, chainId)
    if (requestParams && 'signerAddress' in requestParams)
      return getWalletAccountFromCosmosParams(connectedAccounts, requestParams)
    if (isSolanaMethod(method))
      return getWalletAccountFromSolanaParams(connectedAccounts, requestParams, chainId)
    return undefined
  }, [connectedAccounts, method, requestParams, chainId])

  const accountMetadata = accountId ? accountMetadataById[accountId] : undefined

  const message =
    request && (isSignRequest(request) || isSignTypedRequest(request))
      ? getSignParamsMessage(request.params, true)
      : undefined

  return {
    address,
    transaction,
    message,
    method,
    requestEvent,
    connectedAccounts,
    accountId,
    accountMetadata,
    chainId,
  }
}
