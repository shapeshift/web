import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { BTCInputScriptType, supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { getSdkError } from '@walletconnect/utils'

import type {
  BIP122SignMessageCallRequestParams,
  SupportedSessionRequest,
} from '@/plugins/walletConnectToDapps/types'
import { BIP122SigningMethod } from '@/plugins/walletConnectToDapps/types'

type ApproveBIP122RequestArgs = {
  requestEvent: SupportedSessionRequest
  wallet: HDWallet
}

const DEFAULT_BTC_ADDRESS_N_LIST = [0x80000000 + 84, 0x80000000 + 0, 0x80000000 + 0, 0, 0]

export const approveBIP122Request = async ({
  requestEvent,
  wallet,
}: ApproveBIP122RequestArgs): Promise<JsonRpcResult<unknown>> => {
  const { params, id } = requestEvent
  const { request } = params

  if (!supportsBTC(wallet)) {
    throw new Error('Wallet does not support Bitcoin')
  }

  switch (request.method) {
    case BIP122SigningMethod.BIP122_SIGN_MESSAGE: {
      const { message } = request.params as BIP122SignMessageCallRequestParams

      const signedMessage = await wallet.btcSignMessage({
        addressNList: DEFAULT_BTC_ADDRESS_N_LIST,
        coin: 'Bitcoin',
        scriptType: BTCInputScriptType.SpendWitness,
        message,
      })

      if (!signedMessage) {
        throw new Error('Failed to sign Bitcoin message')
      }

      return formatJsonRpcResult(id, {
        address: signedMessage.address,
        signature: signedMessage.signature,
      })
    }

    case BIP122SigningMethod.BIP122_SIGN_PSBT: {
      throw new Error('signPsbt is not yet fully supported')
    }

    case BIP122SigningMethod.BIP122_SEND_TRANSFER: {
      throw new Error('sendTransfer is not yet fully supported')
    }

    case BIP122SigningMethod.BIP122_GET_ACCOUNT_ADDRESSES: {
      const address = await wallet.btcGetAddress({
        addressNList: DEFAULT_BTC_ADDRESS_N_LIST,
        coin: 'Bitcoin',
        scriptType: BTCInputScriptType.SpendWitness,
        showDisplay: false,
      })

      if (!address) {
        throw new Error('Failed to get Bitcoin address')
      }

      return formatJsonRpcResult(id, [{ address }])
    }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}
