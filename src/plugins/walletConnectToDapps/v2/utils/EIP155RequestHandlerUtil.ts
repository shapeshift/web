import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { EvmBaseAdapter, EvmChainId } from '@shapeshiftoss/chain-adapters'
import { toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignedTypedData, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import type { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { getSdkError } from '@walletconnect/utils'
import {
  convertNumberToHex,
  getFeesForTx,
  getGasData,
  getSignParamsMessage,
} from 'plugins/walletConnectToDapps/utils'
import type {
  CustomTransactionData,
  SupportedSessionRequest,
} from 'plugins/walletConnectToDapps/v2/types'
import { EIP155_SigningMethod } from 'plugins/walletConnectToDapps/v2/types'
import { assertIsDefined } from 'lib/utils'
import type { AccountMetadata } from 'state/slices/portfolioSlice/portfolioSliceCommon'

type ApproveEIP155RequestArgs = {
  requestEvent: SupportedSessionRequest
  wallet: HDWallet
  chainAdapter: EvmBaseAdapter<EvmChainId>
  accountMetadata?: AccountMetadata
  customTransactionData?: CustomTransactionData
  accountId?: AccountId
}

function assertSupportsEthSignTypedData(
  wallet: HDWallet,
): asserts wallet is KeepKeyHDWallet | NativeHDWallet {
  if (!(wallet as KeepKeyHDWallet | NativeHDWallet).ethSignTypedData)
    throw new Error('approveEIP155Request: ethSignTypedData not supported')
}

export const approveEIP155Request = async ({
  requestEvent,
  wallet,
  chainAdapter,
  accountMetadata,
  customTransactionData,
  accountId,
}: ApproveEIP155RequestArgs): Promise<JsonRpcResult<ETHSignedTypedData | string>> => {
  const { params, id } = requestEvent
  const { request } = params
  const bip44Params = accountMetadata?.bip44Params
  const accountNumber = bip44Params?.accountNumber
  const addressNList = bip44Params ? toAddressNList(bip44Params) : []

  switch (request.method) {
    case EIP155_SigningMethod.PERSONAL_SIGN:
    case EIP155_SigningMethod.ETH_SIGN: {
      const message = getSignParamsMessage(request.params)
      const messageToSign = { addressNList, message }
      const input = { messageToSign, wallet }
      const signedMessage = await chainAdapter.signMessage(input)
      if (!signedMessage) throw new Error('approveEIP155Request: signMessage failed')
      return formatJsonRpcResult(id, signedMessage)
    }

    case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA:
    case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V3:
    case EIP155_SigningMethod.ETH_SIGN_TYPED_DATA_V4: {
      assertSupportsEthSignTypedData(wallet)

      const payloadString = request.params[1]
      const typedData = JSON.parse(payloadString)
      const messageToSign = { addressNList, typedData }
      const signedData = await wallet.ethSignTypedData(messageToSign)
      if (!signedData) throw new Error('approveEIP155Request: signMessage failed')
      return formatJsonRpcResult(id, signedData.signature)
    }

    case EIP155_SigningMethod.ETH_SEND_TRANSACTION: {
      assertIsDefined(customTransactionData)
      assertIsDefined(accountNumber)
      assertIsDefined(accountId)

      const sendTransaction = request.params[0]
      const maybeAdvancedParamsNonce = customTransactionData.nonce
        ? convertNumberToHex(customTransactionData.nonce)
        : null
      const didUserChangeNonce =
        maybeAdvancedParamsNonce && maybeAdvancedParamsNonce !== sendTransaction.nonce
      const fees = await getFeesForTx(sendTransaction, chainAdapter, accountId)
      const gasData = getGasData(customTransactionData, fees)
      const { txToSign: txToSignWithPossibleWrongNonce } = await chainAdapter.buildCustomTx({
        wallet,
        accountNumber,
        to: sendTransaction.to,
        data: sendTransaction.data,
        value: sendTransaction.value ?? '0',
        // https://docs.walletconnect.com/2.0/advanced/rpc-reference/ethereum-rpc#eth_sendtransaction
        gasLimit: customTransactionData.gasLimit ?? sendTransaction.gasLimit ?? '90000',
        ...gasData,
      })
      const txToSign = {
        ...txToSignWithPossibleWrongNonce,
        nonce: didUserChangeNonce ? maybeAdvancedParamsNonce : txToSignWithPossibleWrongNonce.nonce,
      }
      const signedTx = await chainAdapter.signTransaction({
        txToSign,
        wallet,
      })
      return formatJsonRpcResult(id, signedTx)
    }

    case EIP155_SigningMethod.ETH_SIGN_TRANSACTION: {
      assertIsDefined(customTransactionData)
      assertIsDefined(accountId)

      const signTransaction = request.params[0]
      const nonce = customTransactionData.nonce
        ? convertNumberToHex(customTransactionData.nonce)
        : signTransaction.nonce
      if (!nonce) throw new Error('approveEIP155Request: missing nonce')
      const gasLimit =
        (customTransactionData.gasLimit
          ? convertNumberToHex(customTransactionData.gasLimit)
          : signTransaction.gasLimit) ?? convertNumberToHex(90000) // https://docs.walletconnect.com/2.0/advanced/rpc-reference/ethereum-rpc#eth_sendtransaction
      const fees = await getFeesForTx(signTransaction, chainAdapter, accountId)
      const gasData = getGasData(customTransactionData, fees)
      const signature = await chainAdapter.signTransaction({
        txToSign: {
          addressNList,
          chainId: parseInt(fromAccountId(accountId).chainReference),
          data: signTransaction.data,
          gasLimit,
          nonce,
          to: signTransaction.to,
          value: signTransaction.value ?? convertNumberToHex(0),
          ...gasData,
        },
        wallet,
      })
      return formatJsonRpcResult(id, signature)
    }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}
