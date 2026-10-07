import { useMemo } from 'react'

import {
  isSignRequest,
  isSignTypedRequest,
  isTransactionParamsArray,
} from '@/plugins/walletConnectToDapps/typeGuards'
import type { KnownSigningMethod, WalletConnectState } from '@/plugins/walletConnectToDapps/types'
import {
  extractConnectedAccounts,
  getRequestAccount,
  getRequestSigner,
  getSignParamsMessage,
} from '@/plugins/walletConnectToDapps/utils'
import { selectWalletAccountIds } from '@/state/slices/common-selectors'
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

  const walletAccountIds = useAppSelector(selectWalletAccountIds)
  const session = requestEvent ? sessionsByTopic[requestEvent.topic] : undefined
  const connectedAccounts = useMemo(
    () =>
      session
        ? extractConnectedAccounts(session).filter(
            id => id.startsWith('bip122:') || walletAccountIds.includes(id),
          )
        : [],
    [session, walletAccountIds],
  )
  const address = request ? getRequestSigner(request.method, request.params) : undefined
  const accountMetadataById = useAppSelector(selectPortfolioAccountMetadata)
  const accountId = useMemo(
    () =>
      request && chainId
        ? getRequestAccount(connectedAccounts, request.method, request.params, chainId)
        : undefined,
    [connectedAccounts, request, chainId],
  )

  const accountMetadata = accountId ? accountMetadataById[accountId] : undefined

  const message =
    request && (isSignRequest(request) || isSignTypedRequest(request))
      ? getSignParamsMessage(request.params, true, request.method)
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
