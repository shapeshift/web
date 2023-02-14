import { formatJsonRpcError, formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { SignClientTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { getSignParamsMessage } from 'plugins/walletConnectToDapps/utils'
import type { CustomTransactionData } from 'plugins/walletConnectToDapps/v2/types'
import { EIP155_SigningMethod } from 'plugins/walletConnectToDapps/v2/types'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'

type ApproveEIP155RequestArgs = {
  requestEvent: SignClientTypes.EventArguments['session_request']
  wallet: HDWallet
  chainAdapter: EvmBaseAdapter<EvmChainId>
  accountMetadata: AccountMetadata
  customTransactionData: CustomTransactionData
}
export const approveEIP155Request = async ({
  requestEvent,
  wallet,
  chainAdapter,
  accountMetadata,
  customTransactionData,
}: ApproveEIP155RequestArgs) => {
  const { params, id } = requestEvent
  const { request } = params

  switch (request.method) {
    case EIP155_SigningMethod.PERSONAL_SIGN:
    case EIP155_SigningMethod.ETH_SIGN:
      const message = getSignParamsMessage(request.params)
      const { bip44Params } = accountMetadata
      const addressNList = toAddressNList(bip44Params)
      const messageToSign = { addressNList, message }
      const input = { messageToSign, wallet }
      const signedMessage = await chainAdapter.signMessage(input)
      if (!signedMessage) throw new Error('WalletConnectBridgeProvider: signMessage failed')
      return formatJsonRpcResult(id, signedMessage)

    // case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA:
    // case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V3:
    // case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V4:
    //   const { domain, types, message: data } = getSignTypedDataParamsData(request.params)
    //   // https://github.com/ethers-io/ethers.js/issues/687#issuecomment-714069471
    //   delete types.EIP712Domain
    //   const signedData = await wallet._signTypedData(domain, types, data)
    //   return formatJsonRpcResult(id, signedData)
    //
    // case EIP155_SigningMethod.ETH_SEND_TRANSACTION:
    //   const sendTransaction = request.params[0]
    //   const { hash } = await connectedWallet.sendTransaction(sendTransaction)
    //   return formatJsonRpcResult(id, hash)
    //
    // case EIP155_SigningMethod.ETH_SIGN_TRANSACTION:
    //   const signTransaction = request.params[0]
    //   const signature = await wallet.signTransaction(signTransaction)
    //   return formatJsonRpcResult(id, signature)

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}

export const rejectEIP155Request = (request: SignClientTypes.EventArguments['session_request']) => {
  const { id } = request
  return formatJsonRpcError(id, getSdkError('USER_REJECTED_METHODS').message)
}
