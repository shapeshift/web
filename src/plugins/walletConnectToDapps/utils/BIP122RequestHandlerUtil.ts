import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import { Psbt } from '@shapeshiftoss/bitcoinjs-lib'
import type { UtxoChainAdapter } from '@shapeshiftoss/chain-adapters'
import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { BTCInputScriptType, BTCOutputAddressType, supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { UtxoAccountType } from '@shapeshiftoss/types'
import { getSdkError } from '@walletconnect/utils'

import type {
  BIP122SendTransferCallRequestParams,
  BIP122SignMessageCallRequestParams,
  BIP122SignPsbtCallRequestParams,
  SupportedSessionRequest,
} from '@/plugins/walletConnectToDapps/types'
import { BIP122SigningMethod } from '@/plugins/walletConnectToDapps/types'

type ApproveBIP122RequestArgs = {
  requestEvent: SupportedSessionRequest
  wallet: HDWallet
  chainAdapter?: UtxoChainAdapter
}

const DEFAULT_BTC_ADDRESS_N_LIST = [0x80000000 + 84, 0x80000000 + 0, 0x80000000 + 0, 0, 0]

export const approveBIP122Request = async ({
  requestEvent,
  wallet,
  chainAdapter,
}: ApproveBIP122RequestArgs): Promise<JsonRpcResult<unknown>> => {
  const { params, id } = requestEvent
  const { request } = params

  if (!supportsBTC(wallet)) {
    throw new Error('Wallet does not support Bitcoin')
  }

  console.log('[WC BIP122] approveBIP122Request', {
    method: request.method,
    params: request.params,
    supportsBTC: supportsBTC(wallet),
  })

  switch (request.method) {
    case BIP122SigningMethod.BIP122_SIGN_MESSAGE: {
      const { message } = request.params as BIP122SignMessageCallRequestParams
      console.log('[WC BIP122] signMessage - message:', message)

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
      const { psbt: psbtBase64, broadcast } = request.params as BIP122SignPsbtCallRequestParams

      const psbt = Psbt.fromBase64(psbtBase64)
      const txInputs = psbt.txInputs
      const txOutputs = psbt.txOutputs

      const inputs = txInputs.map((txInput, i) => {
        const psbtInput = psbt.data.inputs[i]
        const witnessUtxo = psbtInput.witnessUtxo
        const nonWitnessUtxo = psbtInput.nonWitnessUtxo

        const txid = Buffer.from(txInput.hash).reverse().toString('hex')
        const vout = txInput.index
        const sequence = txInput.sequence

        if (nonWitnessUtxo) {
          return {
            addressNList: DEFAULT_BTC_ADDRESS_N_LIST,
            scriptType: BTCInputScriptType.SpendWitness,
            amount: witnessUtxo ? witnessUtxo.value.toString() : '0',
            vout,
            txid,
            hex: Buffer.from(nonWitnessUtxo).toString('hex'),
            ...(sequence !== undefined && { sequence }),
          }
        }

        if (witnessUtxo) {
          const scriptPubKeyHex = Buffer.from(witnessUtxo.script).toString('hex')
          const fakeTx = {
            version: 0,
            locktime: 0,
            vin: [] as [],
            vout: Array.from({ length: vout + 1 }, (_, j) => ({
              value: j === vout ? witnessUtxo.value.toString() : '0',
              scriptPubKey: {
                hex: j === vout ? scriptPubKeyHex : '',
              },
            })),
          }

          return {
            addressNList: DEFAULT_BTC_ADDRESS_N_LIST,
            scriptType: BTCInputScriptType.SpendWitness,
            amount: witnessUtxo.value.toString(),
            vout,
            txid,
            tx: fakeTx,
            ...(sequence !== undefined && { sequence }),
          }
        }

        throw new Error(`PSBT input ${i} has neither witnessUtxo nor nonWitnessUtxo`)
      })

      const outputs = txOutputs.map(txOutput => {
        if (txOutput.address) {
          return {
            addressType: BTCOutputAddressType.Spend,
            amount: txOutput.value.toString(),
            address: txOutput.address,
          }
        }

        return {
          amount: '0' as const,
          opReturnData: Buffer.from(txOutput.script) as Uint8Array,
        }
      })

      // btcSignTx types are complex guarded unions - cast to any for the PSBT reconstruction path
      const signedTx = await wallet.btcSignTx({
        coin: 'Bitcoin',
        inputs: inputs as any,
        outputs: outputs as any,
        version: psbt.version,
        locktime: psbt.locktime,
      })

      if (!signedTx) throw new Error('Failed to sign Bitcoin transaction')

      if (broadcast && chainAdapter) {
        const txid = await chainAdapter.broadcastTransaction({
          hex: signedTx.serializedTx,
        })
        return formatJsonRpcResult(id, { txid })
      }

      return formatJsonRpcResult(id, { psbt: signedTx.serializedTx })
    }

    case BIP122SigningMethod.BIP122_SEND_TRANSFER: {
      const { recipientAddress, amount } = request.params as BIP122SendTransferCallRequestParams

      if (!chainAdapter) throw new Error('Chain adapter required for sendTransfer')

      const pubkey = (await chainAdapter.getPublicKey(wallet, 0, UtxoAccountType.SegwitNative)).xpub

      const feeData = await chainAdapter.getFeeData({
        to: recipientAddress,
        value: amount,
        chainSpecific: { pubkey },
      })

      const { txToSign } = await chainAdapter.buildSendTransaction({
        to: recipientAddress,
        value: amount,
        wallet,
        accountNumber: 0,
        chainSpecific: {
          accountType: UtxoAccountType.SegwitNative,
          satoshiPerByte: feeData.average.chainSpecific.satoshiPerByte,
        },
      })

      const signedHex = await chainAdapter.signTransaction({ txToSign, wallet })
      const txid = await chainAdapter.broadcastTransaction({ hex: signedHex })

      return formatJsonRpcResult(id, { txid })
    }

    default:
      throw new Error(getSdkError('INVALID_METHOD').message)
  }
}
