import { useIsInteractingWithContract } from 'plugins/walletConnectToDapps/hooks/useIsInteractingWithContract'
import {
  extractConnectedAccounts,
  getSignParamsMessage,
  getWalletAddressFromParams,
} from 'plugins/walletConnectToDapps/utils'
import type {
  EIP155_SigningMethod,
  WalletConnectState,
} from 'plugins/walletConnectToDapps/v2/types'
import { isSignRequest, isSignTypedRequest } from 'plugins/walletConnectToDapps/v2/types'
import { assertIsDefined } from 'lib/utils'

export const useWalletConnectState = (state: Required<WalletConnectState>) => {
  const {
    modalData: { requestEvent },
    session,
  } = state
  assertIsDefined(requestEvent)

  const { params } = requestEvent
  const { request, chainId } = params
  const { params: transactionParams } = request
  const transaction = transactionParams[0]

  const connectedAccounts = extractConnectedAccounts(session)
  const address = getWalletAddressFromParams(connectedAccounts, params)
  const message =
    isSignRequest(request) || isSignTypedRequest(request)
      ? getSignParamsMessage(request.params)
      : undefined
  const method: EIP155_SigningMethod = requestEvent.params.request.method

  const isInteractingWithContract = useIsInteractingWithContract({ evmChainId: chainId, address })

  return { isInteractingWithContract, address, transaction, message, method }
}
