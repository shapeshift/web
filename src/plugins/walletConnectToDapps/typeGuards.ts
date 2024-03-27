import type {
  EthPersonalSignCallRequest,
  EthSignCallRequest,
  EthSignParams,
  EthSignTypedDataCallRequest,
  RequestParams,
  TransactionParams,
  WalletConnectRequest,
} from 'plugins/walletConnectToDapps/types'
import { EIP155_SigningMethod } from 'plugins/walletConnectToDapps/types'
import { isTruthy } from 'lib/utils'

export const isTransactionParamsArray = (
  transactions: RequestParams | undefined,
): transactions is TransactionParams[] =>
  (transactions as TransactionParams[])?.every?.(isTransactionParams)

export const isEthSignParams = (requestParams: RequestParams): requestParams is EthSignParams => {
  if (!Array.isArray(requestParams)) return false

  // some dapps (rarible) add a sneaky "" at the end of the array
  const cleanedArray = requestParams.filter(isTruthy)

  return (
    cleanedArray.length === 2 &&
    typeof cleanedArray[0] === 'string' &&
    typeof cleanedArray[1] === 'string'
  )
}

export const isSignRequest = (
  request: WalletConnectRequest,
): request is EthSignCallRequest | EthPersonalSignCallRequest =>
  [EIP155_SigningMethod.ETH_SIGN, EIP155_SigningMethod.PERSONAL_SIGN].includes(
    request.method as EIP155_SigningMethod,
  )

export const isSignTypedRequest = (
  request: WalletConnectRequest,
): request is EthSignTypedDataCallRequest =>
  [
    EIP155_SigningMethod.ETH_SIGN_TYPED_DATA,
    EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V3,
    EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V4,
  ].includes(request.method as EIP155_SigningMethod)

export const isTransactionParams = (
  transaction: TransactionParams | string | undefined,
): transaction is TransactionParams =>
  typeof transaction === 'object' &&
  transaction !== null &&
  !!transaction.from &&
  !!transaction.to &&
  !!transaction.data &&
  Boolean(
    (transaction.gasLimit !== undefined && transaction.gasPrice !== undefined) ||
      transaction.gas !== undefined ||
      (transaction.maxFeePerGas !== undefined && transaction.maxPriorityFeePerGas !== undefined) ||
      // All gas params undefined is also a valid payload
      (transaction.gasLimit === undefined &&
        transaction.gasPrice === undefined &&
        transaction.gas === undefined &&
        transaction.maxFeePerGas === undefined &&
        transaction.maxPriorityFeePerGas === undefined),
  )
