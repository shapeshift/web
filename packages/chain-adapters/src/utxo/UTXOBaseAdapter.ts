import { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  bip32ToAddressNList,
  BTCOutputAddressType,
  BTCOutputScriptType,
  BTCSignTxInput,
  BTCSignTxOutput,
  HDWallet,
  PublicKey,
  supportsBTC
} from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import WAValidator from 'multicoin-address-validator'

import { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import {
  Account,
  BuildSendTxInput,
  ChainTxType,
  FeeDataEstimate,
  FeeDataKey,
  GetFeeDataInput,
  SignTxInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TxHistoryInput,
  TxHistoryResponse,
  ValidAddressResult,
  ValidAddressResultType
} from '../types'
import {
  accountTypeToScriptType,
  chainIdToChainLabel,
  convertXpubVersion,
  getStatus,
  getType,
  toPath,
  toRootDerivationPath
} from '../utils'
import { bnOrZero } from '../utils/bignumber'
import { GetAddressInput } from './types'
import { utxoSelect } from './utxoSelect'

export const UTXOChainIds = [KnownChainIds.BitcoinMainnet, KnownChainIds.DogecoinMainnet] as const

export type UtxoChainId = typeof UTXOChainIds[number]

/**
 * Currently, we don't have a generic interact for UTXO providers, but will in the future.
 * Leaving this as-is for now, but we will need to test in the future when we have additional
 * UTXO chains implemented in unchained.
 */
export interface ChainAdapterArgs {
  providers: {
    http: unchained.bitcoin.V1Api | unchained.dogecoin.V1Api
    ws: unchained.ws.Client<unchained.bitcoin.BitcoinTx | unchained.dogecoin.BitcoinTx>
  }
  coinName: string
  chainId?: UtxoChainId
}

/**
 * Base chain adapter for all UTXO chains. When extending please add your ChainId to the
 * UTXOChainIds. For example:
 *
 * `export type UTXOChainIds = KnownChainIds.BitcoinMainnet | KnownChainIds.Litecoin`
 */
export abstract class UTXOBaseAdapter<T extends UtxoChainId> implements IChainAdapter<T> {
  protected chainId: UtxoChainId
  protected assetId: AssetId
  protected coinName: string
  protected accountAddresses: Record<string, Array<string>> = {}
  protected readonly supportedChainIds: ChainId[]
  protected readonly providers: {
    http: unchained.bitcoin.V1Api | unchained.dogecoin.V1Api
    ws: unchained.ws.Client<unchained.bitcoin.BitcoinTx | unchained.dogecoin.BitcoinTx>
  }

  protected constructor(args: ChainAdapterArgs) {
    this.providers = args.providers
  }

  /* Abstract Methods */
  abstract getAssetId(): AssetId
  abstract getChainId(): ChainId
  abstract closeTxs(): void
  abstract getType(): T
  abstract getSupportedAccountTypes(): UtxoAccountType[]
  abstract getDefaultBip44Params(): BIP44Params
  abstract getDefaultAccountType(): UtxoAccountType
  abstract getTransactionParser():
    | unchained.bitcoin.TransactionParser
    | unchained.dogecoin.TransactionParser
  abstract getFeeAssetId(): AssetId
  abstract accountTypeToOutputScriptType(accountType: UtxoAccountType): BTCOutputScriptType
  abstract buildBIP44Params(params: Partial<BIP44Params>): BIP44Params
  abstract getDisplayName(): string

  /* public methods */
  async getAccount(pubkey: string): Promise<Account<T>> {
    if (!pubkey) {
      return ErrorHandler('UTXOBaseAdapter: pubkey parameter is not defined')
    }

    try {
      const { data } = await this.providers.http.getAccount({ pubkey })

      const balance = bnOrZero(data.balance).plus(bnOrZero(data.unconfirmedBalance))

      // cache addresses for getTxHistory to use without needing to make extra requests
      this.accountAddresses[data.pubkey] = data.addresses?.map((address) => address.pubkey) ?? [
        data.pubkey
      ]

      return {
        balance: balance.toString(),
        chain: this.getType(),
        chainId: this.chainId,
        assetId: this.assetId,
        chainSpecific: {
          addresses: data.addresses,
          nextChangeAddressIndex: data.nextChangeAddressIndex,
          nextReceiveAddressIndex: data.nextReceiveAddressIndex
        },
        pubkey: data.pubkey
      } as Account<T>
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getAddress({
    wallet,
    bip44Params,
    accountType,
    showOnDevice = false
  }: GetAddressInput): Promise<string> {
    if (!supportsBTC(wallet)) {
      throw new Error('UTXOBaseAdapter: wallet does not support btc')
    }

    if (!bip44Params) {
      bip44Params = this.getDefaultBip44Params()
    }

    if (!accountType) {
      accountType = this.getDefaultAccountType()
    }

    let { index } = bip44Params

    // If an index is not passed in, we want to use the newest unused change/receive indices
    if (index === undefined) {
      const { xpub } = await this.getPublicKey(wallet, bip44Params, accountType)
      const account = await this.getAccount(xpub)
      index = bip44Params.isChange
        ? account.chainSpecific.nextChangeAddressIndex
        : account.chainSpecific.nextReceiveAddressIndex
    }

    const path = toPath({ ...bip44Params, index })
    const addressNList = bip32ToAddressNList(path)
    const btcAddress = await wallet.btcGetAddress({
      addressNList,
      coin: this.coinName,
      scriptType: accountTypeToScriptType[accountType],
      showDisplay: showOnDevice
    })
    if (!btcAddress) throw new Error('UTXOBaseAdapter: no address available from wallet')
    return btcAddress
  }

  async buildSendTransaction(tx: BuildSendTxInput<T>): Promise<{
    txToSign: ChainTxType<T>
  }> {
    try {
      const {
        value,
        to,
        wallet,
        chainSpecific: { satoshiPerByte, accountType, opReturnData },
        sendMax = false
      } = tx

      if (!value || !to) {
        throw new Error('UTXOBaseAdapter: (to and value) are required')
      }

      let { bip44Params } = tx
      if (!bip44Params) {
        bip44Params = this.getDefaultBip44Params()
      }

      const path = toRootDerivationPath(bip44Params)
      const pubkey = await this.getPublicKey(wallet, bip44Params, accountType)
      const { data: utxos } = await this.providers.http.getUtxos({
        pubkey: pubkey.xpub
      })

      if (!supportsBTC(wallet))
        throw new Error('UTXOBaseAdapter: signTransaction wallet does not support signing btc txs')

      const account = await this.getAccount(pubkey.xpub)

      const coinSelectResult = utxoSelect({
        utxos,
        to,
        satoshiPerByte,
        sendMax,
        value,
        opReturnData
      })

      if (!coinSelectResult || !coinSelectResult.inputs || !coinSelectResult.outputs) {
        throw new Error(`UTXOBaseAdapter: coinSelect didn't select coins`)
      }

      const { inputs, outputs } = coinSelectResult

      const signTxInputs: BTCSignTxInput[] = []
      for (const input of inputs) {
        if (!input.path) continue
        const getTransactionResponse = await this.providers.http.getTransaction({
          txid: input.txid
        })
        const inputTx = getTransactionResponse.data

        signTxInputs.push({
          addressNList: bip32ToAddressNList(input.path),
          // https://github.com/shapeshift/hdwallet/issues/362
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          scriptType: accountTypeToScriptType[accountType] as any,
          amount: String(input.value),
          vout: input.vout,
          txid: input.txid,
          hex: inputTx.hex
        })
      }

      const signTxOutputs: BTCSignTxOutput[] = outputs.map((out) => {
        const amount = String(out.value)
        if (!out.address) {
          return {
            addressType: BTCOutputAddressType.Change,
            amount,
            addressNList: bip32ToAddressNList(
              `${path}/1/${String(account.chainSpecific.nextChangeAddressIndex)}`
            ),
            scriptType: this.accountTypeToOutputScriptType(accountType),
            isChange: true
          }
        } else {
          return {
            addressType: BTCOutputAddressType.Spend,
            amount,
            address: out.address
          }
        }
      })

      const txToSign = {
        coin: this.coinName,
        inputs: signTxInputs,
        outputs: signTxOutputs,
        opReturnData
      } as ChainTxType<T>
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getFeeData({
    to,
    value,
    chainSpecific: { pubkey, opReturnData },
    sendMax = false
  }: GetFeeDataInput<T>): Promise<FeeDataEstimate<T>> {
    const feeData = await this.providers.http.getNetworkFees()

    if (!to || !value || !pubkey) throw new Error('to, from, value and pubkey are required')
    if (!feeData.data.average?.satsPerKiloByte || !feeData.data.slow?.satsPerKiloByte) {
      throw new Error('undefined fee')
    }

    if (!feeData.data.fast?.satsPerKiloByte || feeData.data.fast?.satsPerKiloByte < 0) {
      feeData.data.fast = feeData.data.average
    }
    // We have to round because coinselect library uses sats per byte which cant be decimals
    const fastPerByte = String(Math.round(feeData.data.fast.satsPerKiloByte / 1024))
    const averagePerByte = String(Math.round(feeData.data.average.satsPerKiloByte / 1024))
    const slowPerByte = String(Math.round(feeData.data.slow.satsPerKiloByte / 1024))

    const { data: utxos } = await this.providers.http.getUtxos({
      pubkey
    })

    const utxoSelectInput = {
      to,
      value,
      opReturnData,
      utxos,
      sendMax
    }

    const { fee: fastFee } = utxoSelect({
      ...utxoSelectInput,
      satoshiPerByte: fastPerByte
    })
    const { fee: averageFee } = utxoSelect({
      ...utxoSelectInput,
      satoshiPerByte: averagePerByte
    })
    const { fee: slowFee } = utxoSelect({
      ...utxoSelectInput,
      satoshiPerByte: slowPerByte
    })

    return {
      [FeeDataKey.Fast]: {
        txFee: String(fastFee),
        chainSpecific: {
          satoshiPerByte: fastPerByte
        }
      },
      [FeeDataKey.Average]: {
        txFee: String(averageFee),
        chainSpecific: {
          satoshiPerByte: averagePerByte
        }
      },
      [FeeDataKey.Slow]: {
        txFee: String(slowFee),
        chainSpecific: {
          satoshiPerByte: slowPerByte
        }
      }
    } as FeeDataEstimate<T>
  }

  async signTransaction(signTxInput: SignTxInput<ChainTxType<T>>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput
      if (!supportsBTC(wallet))
        throw new Error('UTXOBaseAdapter: signTransaction wallet does not support signing btc txs')

      const signedTx = await wallet.btcSignTx(txToSign)
      if (!signedTx) throw ErrorHandler('UTXOBaseAdapter: error signing tx')
      return signedTx.serializedTx
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse<T>> {
    if (!this.accountAddresses[input.pubkey]) {
      await this.getAccount(input.pubkey)
    }

    const { data } = await this.providers.http.getTxHistory({
      pubkey: input.pubkey,
      pageSize: input.pageSize,
      cursor: input.cursor
    })

    const getAddresses = (
      tx: unchained.bitcoin.BitcoinTx | unchained.dogecoin.BitcoinTx
    ): Array<string> => {
      const addresses: Array<string> = []

      tx.vin?.forEach((vin) => {
        if (!vin.addresses) return
        addresses.push(...vin.addresses)
      })

      tx.vout?.forEach((vout) => {
        if (!vout.addresses) return
        addresses.push(...vout.addresses)
      })

      return [...new Set(addresses)]
    }

    const txs = await Promise.all(
      (data.txs ?? []).map(async (tx) => {
        const addresses = getAddresses(tx).filter((addr) =>
          this.accountAddresses[input.pubkey].includes(addr)
        )

        return await Promise.all(
          addresses.map(async (addr) => {
            const parsedTx = await this.getTransactionParser().parse(tx, addr)

            return {
              address: addr,
              blockHash: parsedTx.blockHash,
              blockHeight: parsedTx.blockHeight,
              blockTime: parsedTx.blockTime,
              chainId: parsedTx.chainId,
              chain: this.getType(),
              confirmations: parsedTx.confirmations,
              txid: parsedTx.txid,
              fee: parsedTx.fee,
              status: getStatus(parsedTx.status),
              tradeDetails: parsedTx.trade,
              transfers: parsedTx.transfers.map((transfer) => ({
                assetId: transfer.assetId,
                from: transfer.from,
                to: transfer.to,
                type: getType(transfer.type),
                value: transfer.totalValue
              }))
            }
          })
        )
      })
    )

    return {
      cursor: data.cursor ?? '',
      pubkey: input.pubkey,
      transactions: txs.flat()
    }
  }

  async broadcastTransaction(hex: string): Promise<string> {
    const { data } = await this.providers.http.sendTx({
      sendTxBody: { hex }
    })
    return data
  }

  async subscribeTxs(
    input: SubscribeTxsInput,
    onMessage: (msg: Transaction<T>) => void,
    onError: (err: SubscribeError) => void
  ): Promise<void> {
    const { wallet } = input

    let { bip44Params, accountType } = input
    if (!bip44Params) {
      bip44Params = this.getDefaultBip44Params()
    }

    if (!accountType) {
      accountType = this.getDefaultAccountType()
    }

    const { xpub } = await this.getPublicKey(wallet, bip44Params, accountType)
    const account = await this.getAccount(xpub)
    const addresses = (account.chainSpecific.addresses ?? []).map((address) => address.pubkey)
    const subscriptionId = `${toRootDerivationPath(bip44Params)}/${accountType}`

    await this.providers.ws.subscribeTxs(
      subscriptionId,
      { topic: 'txs', addresses },
      async (msg) => {
        const tx = await this.getTransactionParser().parse(msg.data, msg.address)

        onMessage({
          address: tx.address,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.blockTime,
          chainId: tx.chainId,
          chain: this.getType(),
          confirmations: tx.confirmations,
          fee: tx.fee,
          status: getStatus(tx.status),
          tradeDetails: tx.trade,
          transfers: tx.transfers.map((transfer) => ({
            assetId: transfer.assetId,
            from: transfer.from,
            to: transfer.to,
            type: getType(transfer.type),
            value: transfer.totalValue
          })),
          txid: tx.txid
        })
      },
      (err) => onError({ message: err.message })
    )
  }

  unsubscribeTxs(input?: SubscribeTxsInput): void {
    if (!input) return this.providers.ws.unsubscribeTxs()

    let { bip44Params, accountType } = input
    if (!bip44Params) {
      bip44Params = this.getDefaultBip44Params()
    }

    if (!accountType) {
      accountType = this.getDefaultAccountType()
    }
    const subscriptionId = `${toRootDerivationPath(bip44Params)}/${accountType}`

    this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] })
  }

  async validateAddress(address: string): Promise<ValidAddressResult> {
    const chainLabel = chainIdToChainLabel(this.chainId)
    const isValidAddress = WAValidator.validate(address, chainLabel)
    if (isValidAddress) return { valid: true, result: ValidAddressResultType.Valid }
    return { valid: false, result: ValidAddressResultType.Invalid }
  }

  async getPublicKey(
    wallet: HDWallet,
    bip44Params: BIP44Params,
    accountType: UtxoAccountType
  ): Promise<PublicKey> {
    const path = toRootDerivationPath(bip44Params)
    const publicKeys = await wallet.getPublicKeys([
      {
        coin: this.coinName,
        addressNList: bip32ToAddressNList(path),
        curve: 'secp256k1', // TODO(0xdef1cafe): from constant?
        scriptType: accountTypeToScriptType[accountType]
      }
    ])
    if (!publicKeys?.[0]) throw new Error("couldn't get public key")

    if (accountType) {
      return { xpub: convertXpubVersion(publicKeys[0].xpub, accountType) }
    }

    return publicKeys[0]
  }
}
