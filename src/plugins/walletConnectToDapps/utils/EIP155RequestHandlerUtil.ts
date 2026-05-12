import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import type { EvmChainAdapter } from '@shapeshiftoss/chain-adapters'
import { FeeDataKey, toAddressNList } from '@shapeshiftoss/chain-adapters'
import type { ETHSignedTypedData, HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { KeepKeyHDWallet } from '@shapeshiftoss/hdwallet-keepkey'
import type { NativeHDWallet } from '@shapeshiftoss/hdwallet-native'
import { isTrezor } from '@shapeshiftoss/hdwallet-trezor'
import type { AccountMetadata } from '@shapeshiftoss/types'
import { getSdkError } from '@walletconnect/utils'
import { toHex } from 'viem'

import { assertIsDefined } from '@/lib/utils'
import type {
  CustomTransactionData,
  SupportedSessionRequest,
} from '@/plugins/walletConnectToDapps/types'
import { EIP155_SigningMethod } from '@/plugins/walletConnectToDapps/types'
import { getSignParamsMessage } from '@/plugins/walletConnectToDapps/utils'

type ApproveEIP155RequestArgs = {
  requestEvent: SupportedSessionRequest
  wallet: HDWallet
  chainAdapter: EvmChainAdapter
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
  const addressNList = bip44Params ? toAddressNList(chainAdapter.getBip44Params(bip44Params)) : []

  switch (request.method) {
    case EIP155_SigningMethod.PERSONAL_SIGN:
    case EIP155_SigningMethod.ETH_SIGN: {
      const message = getSignParamsMessage(request.params, false)
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

      const gasLimit = customTransactionData.gasLimit
      if (!gasLimit) throw new Error('approveEIP155Request: missing gasLimit')

      const feeData = await chainAdapter.getGasFeeData()

      const senderAddress = await chainAdapter.getAddress({
        accountNumber,
        wallet,
        pubKey: isTrezor(wallet) && accountId ? fromAccountId(accountId).account : undefined,
      })

      const { txToSign } = await chainAdapter.buildCustomTx({
        wallet,
        accountNumber,
        to: sendTransaction.to,
        data: sendTransaction.data,
        value: sendTransaction.value ?? '0',
        gasLimit,
        gasPrice: toHex(BigInt(feeData[customTransactionData.speed ?? FeeDataKey.Fast].gasPrice)),
        pubKey: isTrezor(wallet) && accountId ? fromAccountId(accountId).account : undefined,
      })

      const nonce =
        customTransactionData.isUserDefinedNonce && customTransactionData.nonce
          ? customTransactionData.nonce
          : txToSign.nonce

      const signedTx = await chainAdapter.signTransaction({
        txToSign: {
          ...txToSign,
          nonce: toHex(BigInt(nonce)),
        },
        wallet,
      })

      const txHash = await chainAdapter.broadcastTransaction({
        senderAddress,
        receiverAddress: txToSign.to,
        hex: signedTx,
      })

      return formatJsonRpcResult(id, txHash)
    }

    case EIP155_SigningMethod.ETH_SIGN_TRANSACTION: {
      assertIsDefined(customTransactionData)
      assertIsDefined(accountId)

      const signTransaction = request.params[0]

      const nonce =
        customTransactionData.isUserDefinedNonce && customTransactionData.nonce
          ? customTransactionData.nonce
          : signTransaction.nonce

      if (!nonce) throw new Error('approveEIP155Request: missing nonce')

      const feeData = await chainAdapter.getGasFeeData()

      const signature = await chainAdapter.signTransaction({
        txToSign: {
          addressNList,
          chainId: parseInt(fromAccountId(accountId).chainReference),
          data: signTransaction.data,
          gasLimit: toHex(BigInt(customTransactionData.gasLimit || 90000)),
          gasPrice: toHex(BigInt(feeData[customTransactionData.speed ?? FeeDataKey.Fast].gasPrice)),
          nonce: toHex(BigInt(nonce)),
          to: signTransaction.to,
          value: signTransaction.value ?? toHex(0),
        },
        wallet,
      })
      return formatJsonRpcResult(id, signature)
    }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}
