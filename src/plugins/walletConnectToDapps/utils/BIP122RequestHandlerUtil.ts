import type { JsonRpcResult } from '@json-rpc-tools/utils'
import { formatJsonRpcResult } from '@json-rpc-tools/utils'
import { address as btcAddress, Psbt, Transaction } from '@shapeshiftoss/bitcoinjs-lib'
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

type BtcScriptInfo = {
  scriptType: BTCInputScriptType
  addressNList: number[]
}

const detectBtcScriptType = (address: string): BtcScriptInfo => {
  if (address.startsWith('bc1q') || address.startsWith('tb1q')) {
    return {
      scriptType: BTCInputScriptType.SpendWitness,
      addressNList: [0x80000000 + 84, 0x80000000 + 0, 0x80000000 + 0, 0, 0],
    }
  }
  if (address.startsWith('bc1p') || address.startsWith('tb1p')) {
    return {
      scriptType: BTCInputScriptType.SpendWitness,
      addressNList: [0x80000000 + 86, 0x80000000 + 0, 0x80000000 + 0, 0, 0],
    }
  }
  if (address.startsWith('3') || address.startsWith('2')) {
    return {
      scriptType: BTCInputScriptType.SpendP2SHWitness,
      addressNList: [0x80000000 + 49, 0x80000000 + 0, 0x80000000 + 0, 0, 0],
    }
  }
  return {
    scriptType: BTCInputScriptType.SpendAddress,
    addressNList: [0x80000000 + 44, 0x80000000 + 0, 0x80000000 + 0, 0, 0],
  }
}

const detectScriptTypeFromScript = (script: Buffer | Uint8Array): BTCInputScriptType => {
  if (script.length === 22 && script[0] === 0x00 && script[1] === 0x14)
    return BTCInputScriptType.SpendWitness
  if (script.length === 23 && script[0] === 0xa9 && script[22] === 0x87)
    return BTCInputScriptType.SpendP2SHWitness
  if (script.length === 34 && script[0] === 0x51 && script[1] === 0x20)
    return BTCInputScriptType.SpendWitness
  if (script.length === 25 && script[0] === 0x76 && script[1] === 0xa9)
    return BTCInputScriptType.SpendAddress
  return BTCInputScriptType.SpendWitness
}

const addressNListForScriptType = (scriptType: BTCInputScriptType): number[] => {
  switch (scriptType) {
    case BTCInputScriptType.SpendP2SHWitness:
      return [0x80000000 + 49, 0x80000000 + 0, 0x80000000 + 0, 0, 0]
    case BTCInputScriptType.SpendAddress:
      return [0x80000000 + 44, 0x80000000 + 0, 0x80000000 + 0, 0, 0]
    case BTCInputScriptType.SpendWitness:
    default:
      return [0x80000000 + 84, 0x80000000 + 0, 0x80000000 + 0, 0, 0]
  }
}

const serializeWitnessStack = (witness: (Buffer | Uint8Array)[]): Buffer => {
  let length = 1
  for (const item of witness) {
    length += 1 + item.length
  }
  const result = Buffer.alloc(length)
  let offset = 0
  result.writeUInt8(witness.length, offset++)
  for (const item of witness) {
    result.writeUInt8(item.length, offset++)
    result.set(item, offset)
    offset += item.length
  }
  return result
}

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

  switch (request.method) {
    case BIP122SigningMethod.BIP122_SIGN_MESSAGE: {
      const { account, message } = request.params as BIP122SignMessageCallRequestParams
      const { scriptType, addressNList } = detectBtcScriptType(account)

      const signedMessage = await wallet.btcSignMessage({
        addressNList,
        coin: 'Bitcoin',
        scriptType,
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
      const {
        psbt: psbtBase64,
        signInputs,
        broadcast,
      } = request.params as BIP122SignPsbtCallRequestParams

      const psbt = Psbt.fromBase64(psbtBase64)
      const txInputs = psbt.txInputs
      const txOutputs = psbt.txOutputs

      const signInputIndices = new Set(signInputs.map(si => si.index))
      const signInputAddressMap = new Map(signInputs.map(si => [si.index, si.address]))

      const inputs = txInputs.map((txInput, i) => {
        const psbtInput = psbt.data.inputs[i]
        const witnessUtxo = psbtInput.witnessUtxo
        const nonWitnessUtxo = psbtInput.nonWitnessUtxo

        const txid = Buffer.from(txInput.hash).reverse().toString('hex')
        const vout = txInput.index
        const sequence = txInput.sequence

        const signInputAddr = signInputAddressMap.get(i)
        const { scriptType, addressNList } = (() => {
          if (signInputAddr) return detectBtcScriptType(signInputAddr)
          if (witnessUtxo) {
            try {
              const addr = btcAddress.fromOutputScript(witnessUtxo.script)
              return detectBtcScriptType(addr)
            } catch {
              const st = detectScriptTypeFromScript(witnessUtxo.script)
              return { scriptType: st, addressNList: addressNListForScriptType(st) }
            }
          }
          if (nonWitnessUtxo) {
            try {
              const prevTx = Transaction.fromBuffer(Buffer.from(nonWitnessUtxo))
              const prevOutput = prevTx.outs[vout]
              if (prevOutput) {
                const addr = btcAddress.fromOutputScript(prevOutput.script)
                return detectBtcScriptType(addr)
              }
            } catch {
              // fall through
            }
          }
          return {
            scriptType: BTCInputScriptType.SpendWitness,
            addressNList: addressNListForScriptType(BTCInputScriptType.SpendWitness),
          }
        })()

        if (nonWitnessUtxo) {
          return {
            addressNList,
            scriptType,
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
            addressNList,
            scriptType,
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

      const tx = Transaction.fromHex(signedTx.serializedTx)
      for (const i of signInputIndices) {
        const { script, witness } = tx.ins[i]
        const update: { finalScriptSig?: Buffer; finalScriptWitness?: Buffer } = {}

        if (script.length > 0) {
          update.finalScriptSig = Buffer.from(script)
        }

        if (witness.length >= 2) {
          update.finalScriptWitness = serializeWitnessStack(witness)
        }

        if (update.finalScriptSig || update.finalScriptWitness) {
          psbt.updateInput(i, update)
        }
      }

      return formatJsonRpcResult(id, { psbt: psbt.toBase64() })
    }

    case BIP122SigningMethod.BIP122_SEND_TRANSFER: {
      const { account, recipientAddress, amount } =
        request.params as BIP122SendTransferCallRequestParams

      if (!chainAdapter) throw new Error('Chain adapter required for sendTransfer')

      const accountType = (() => {
        if (account.startsWith('3') || account.startsWith('2')) return UtxoAccountType.SegwitP2sh
        if (account.startsWith('1') || account.startsWith('m') || account.startsWith('n'))
          return UtxoAccountType.P2pkh
        return UtxoAccountType.SegwitNative
      })()

      const pubkey = (await chainAdapter.getPublicKey(wallet, 0, accountType)).xpub

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
          accountType,
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
