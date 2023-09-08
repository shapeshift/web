import type {
  EthPersonalSignCallRequest,
  EthSignCallRequest,
  EthSignParams,
  EthSignTypedDataCallRequest,
  RequestParams,
  TransactionParams,
  WalletConnectRequest,
} from 'plugins/walletConnectToDapps/v2/types'
import { EIP155_SigningMethod } from 'plugins/walletConnectToDapps/v2/types'
import { getTypeGuardAssertion } from 'lib/utils'

export const isTransactionParamsArray = (
  transactions: RequestParams | undefined,
): transactions is TransactionParams[] =>
  (transactions as TransactionParams[])?.every?.(isTransactionParams)

export const isEthSignParams = (requestParams: RequestParams): requestParams is EthSignParams =>
  requestParams instanceof Array &&
  requestParams.length === 2 &&
  typeof requestParams[0] === 'string' &&
  typeof requestParams[1] === 'string'

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
  !!transaction?.from &&
  !!transaction?.to &&
  !!transaction?.data &&
  ((!!transaction?.gasLimit && !!transaction?.gasPrice) || !!transaction?.gas)

export const assertIsTransactionParams: (
  transaction: TransactionParams | string | undefined,
) => asserts transaction is TransactionParams = getTypeGuardAssertion(
  isTransactionParams,
  'Transaction has no transaction params',
)
