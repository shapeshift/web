import { useMemo } from 'react'

import { useIsSmartContractAddress } from '@/hooks/useIsSmartContractAddress/useIsSmartContractAddress'
import {
  isEthSignParams,
  isSignRequest,
  isSignTypedRequest,
  isTransactionParamsArray,
} from '@/plugins/walletConnectToDapps/typeGuards'
import type { KnownSigningMethod, WalletConnectState } from '@/plugins/walletConnectToDapps/types'
import {
  extractAllConnectedAccounts,
  getSignParamsMessage,
  getWalletAccountFromCosmosParams,
  getWalletAccountFromEthParams,
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
    if (requestParams) return requestParams.signerAddress
    else return undefined
  }, [connectedAccounts, requestParams])

  const accountMetadataById = useAppSelector(selectPortfolioAccountMetadata)

  const accountId = useMemo(() => {
    if (
      requestParams &&
      (isEthSignParams(requestParams) || isTransactionParamsArray(requestParams))
    )
      return getWalletAccountFromEthParams(connectedAccounts, requestParams)
    if (requestParams) return getWalletAccountFromCosmosParams(connectedAccounts, requestParams)
    else return undefined
  }, [connectedAccounts, requestParams])

  const accountMetadata = accountId ? accountMetadataById[accountId] : undefined

  const { data: _isInteractingWithContract } = useIsSmartContractAddress(
    address ?? '',
    chainId ?? '',
  )

  // use null as loading state of sorts
  const isInteractingWithContract =
    _isInteractingWithContract !== undefined ? _isInteractingWithContract : null

  const message =
    request && (isSignRequest(request) || isSignTypedRequest(request))
      ? getSignParamsMessage(request.params, true)
      : undefined
  const method: KnownSigningMethod | undefined = requestEvent?.params.request.method

  return {
    isInteractingWithContract,
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
