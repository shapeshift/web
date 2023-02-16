import { useIsInteractingWithContract } from 'plugins/walletConnectToDapps/hooks/useIsInteractingWithContract'
import {
  extractConnectedAccounts,
  getSignParamsMessage,
  getWalletAddressFromParams,
} from 'plugins/walletConnectToDapps/utils'
import type { WalletConnectState } from 'plugins/walletConnectToDapps/v2/types'
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
  const message = getSignParamsMessage(request.params)
  const method = state.modalData.requestEvent?.request?.params?.method

  const isInteractingWithContract = useIsInteractingWithContract({ evmChainId: chainId, address })

  return { isInteractingWithContract, address, transaction, message, method }
}
