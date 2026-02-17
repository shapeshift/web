import { fromAccountId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import {
  isEthSignParams,
  isSignRequest,
  isSignTypedRequest,
  isTransactionParamsArray,
} from '@/plugins/walletConnectToDapps/typeGuards'
import type { KnownSigningMethod, WalletConnectState } from '@/plugins/walletConnectToDapps/types'
import { TronSigningMethod } from '@/plugins/walletConnectToDapps/types'
import {
  extractAllConnectedAccounts,
  getSignParamsMessage,
  getWalletAccountFromCosmosParams,
  getWalletAccountFromEthParams,
  getWalletAccountFromTronParams,
  getWalletAddressFromEthSignParams,
} from '@/plugins/walletConnectToDapps/utils'
import { selectPortfolioAccountMetadata } from '@/state/slices/portfolioSlice/selectors'
import { useAppSelector } from '@/state/store'

/*
  A helper hook to derive commonly used information from the WalletConnectState
 */
export const useWalletConnectState = (state: WalletConnectState) => {
  const { modalData, sessionsByTopic } = state
  const requestEvent = modalData?.requestEvent

  const params = requestEvent?.params
  const request = params?.request
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

    const isTronMethod = Object.values(TronSigningMethod).includes(
      request?.method as TronSigningMethod,
    )
    if (isTronMethod && chainId) {
      const tronAccountId = getWalletAccountFromTronParams(connectedAccounts, chainId)
      return tronAccountId ? fromAccountId(tronAccountId).account : undefined
    }
    return undefined
  }, [connectedAccounts, requestParams, request?.method, chainId])

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

    const isTronMethod = Object.values(TronSigningMethod).includes(
      request?.method as TronSigningMethod,
    )
    if (isTronMethod) return getWalletAccountFromTronParams(connectedAccounts, chainId)
    return undefined
  }, [connectedAccounts, requestParams, chainId, request?.method])

  const accountMetadata = accountId ? accountMetadataById[accountId] : undefined

  const message =
    request && (isSignRequest(request) || isSignTypedRequest(request))
      ? getSignParamsMessage(request.params, true)
      : undefined
  const method: KnownSigningMethod | undefined = requestEvent?.params.request.method

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
