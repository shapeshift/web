import { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  bip32ToAddressNList,
  BTCOutputAddressType,
  BTCSignTxInput,
  BTCSignTxOutput,
  HDWallet,
  PublicKey,
  supportsBTC,
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
  GetBIP44ParamsInput,
  GetFeeDataInput,
  SignTxInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TxHistoryInput,
  TxHistoryResponse,
  ValidAddressResult,
  ValidAddressResultType,
} from '../types'
import {
  accountTypeToOutputScriptType,
  accountTypeToScriptType,
  chainIdToChainLabel,
  convertXpubVersion,
  toPath,
  toRootDerivationPath,
} from '../utils'
import { bnOrZero } from '../utils/bignumber'
import { GetAddressInput } from './types'
import { utxoSelect } from './utxoSelect'

export const utxoChainIds = [
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.BitcoinCashMainnet,
  KnownChainIds.DogecoinMainnet,
  KnownChainIds.LitecoinMainnet,
] as const

export type UtxoChainId = typeof utxoChainIds[number]

export interface ChainAdapterArgs {
  chainId?: UtxoChainId
  coinName: string
  providers: {
    http:
      | unchained.bitcoin.V1Api
      | unchained.bitcoincash.V1Api
      | unchained.dogecoin.V1Api
      | unchained.litecoin.V1Api
    ws: unchained.ws.Client<unchained.utxo.types.Tx>
  }
}

export interface UtxoBaseAdapterArgs extends ChainAdapterArgs {
  defaultBIP44Params: BIP44Params
  defaultUtxoAccountType: UtxoAccountType
  supportedChainIds: ChainId[]
  supportedAccountTypes: UtxoAccountType[]
  chainId: UtxoChainId
}

export abstract class UtxoBaseAdapter<T extends UtxoChainId> implements IChainAdapter<T> {
  protected readonly chainId: UtxoChainId
  protected readonly coinName: string
  protected readonly defaultBIP44Params: BIP44Params
  protected readonly defaultUtxoAccountType: UtxoAccountType
  protected readonly supportedChainIds: ChainId[]
  protected readonly supportedAccountTypes: UtxoAccountType[]
  protected readonly providers: {
    http:
      | unchained.bitcoin.V1Api
      | unchained.bitcoincash.V1Api
      | unchained.dogecoin.V1Api
      | unchained.litecoin.V1Api
    ws: unchained.ws.Client<unchained.utxo.types.Tx>
  }

  protected assetId: AssetId
  protected accountAddresses: Record<string, string[]> = {}
  protected parser: unchained.utxo.BaseTransactionParser<unchained.utxo.types.Tx>

  protected constructor(args: UtxoBaseAdapterArgs) {
    this.chainId = args.chainId
    this.coinName = args.coinName
    this.defaultBIP44Params = args.defaultBIP44Params
    this.defaultUtxoAccountType = args.defaultUtxoAccountType
    this.supportedChainIds = args.supportedChainIds
    this.supportedAccountTypes = args.supportedAccountTypes
    this.providers = args.providers

    if (!this.supportedChainIds.includes(this.chainId)) {
      throw new Error(`${this.chainId} not supported. (supported: ${this.supportedChainIds})`)
    }
  }

  abstract getType(): T
  abstract getFeeAssetId(): AssetId
  abstract getDisplayName(): string

  private assertIsAccountTypeSupported(accountType: UtxoAccountType) {
    if (!this.supportedAccountTypes.includes(accountType))
      throw new Error(
        `UtxoBaseAdapter: ${accountType} not supported. (supported: ${this.supportedAccountTypes})`,
      )
  }

  getChainId(): ChainId {
    return this.chainId
  }

  getSupportedAccountTypes(): UtxoAccountType[] {
    return this.supportedAccountTypes
  }

  getCoinName(): string {
    return this.coinName
  }

  buildBIP44Params(params: Partial<BIP44Params>): BIP44Params {
    return { ...this.defaultBIP44Params, ...params }
  }

  getBIP44Params({ accountNumber, accountType }: GetBIP44ParamsInput): BIP44Params {
    if (accountNumber < 0) {
      throw new Error('accountNumber must be >= 0')
    }
    const purpose = (() => {
      switch (accountType) {
        case UtxoAccountType.SegwitNative:
          return 84
        case UtxoAccountType.SegwitP2sh:
          return 49
        case UtxoAccountType.P2pkh:
          return 44
        default:
          throw new Error(`not a supported accountType ${accountType}`)
      }
    })()
    return { ...this.defaultBIP44Params, accountNumber, purpose }
  }

  async getAccount(pubkey: string): Promise<Account<T>> {
    try {
      const data = await this.providers.http.getAccount({ pubkey })

      const balance = bnOrZero(data.balance).plus(bnOrZero(data.unconfirmedBalance))

      // cache addresses for getTxHistory to use without needing to make extra requests
      this.accountAddresses[data.pubkey] = data.addresses?.map((address) => address.pubkey) ?? [
        data.pubkey,
      ]

      return {
        balance: balance.toString(),
        chain: this.getType(),
        chainId: this.chainId,
        assetId: this.assetId,
        chainSpecific: {
          addresses: data.addresses,
          nextChangeAddressIndex: data.nextChangeAddressIndex,
          nextReceiveAddressIndex: data.nextReceiveAddressIndex,
        },
        pubkey: data.pubkey,
      } as Account<T>
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getAddress({
    wallet,
    bip44Params = this.defaultBIP44Params,
    accountType = this.defaultUtxoAccountType,
    showOnDevice = false,
  }: GetAddressInput): Promise<string> {
    try {
      this.assertIsAccountTypeSupported(accountType)

      if (!supportsBTC(wallet)) {
        throw new Error(`UtxoBaseAdapter: wallet does not support ${this.coinName}`)
      }

      const getNextIndex = async () => {
        const { xpub } = await this.getPublicKey(wallet, bip44Params, accountType)
        const account = await this.getAccount(xpub)
        return bip44Params.isChange
          ? account.chainSpecific.nextChangeAddressIndex
          : account.chainSpecific.nextReceiveAddressIndex
      }

      const index = bip44Params.index ?? (await getNextIndex())
      const address = await wallet.btcGetAddress({
        addressNList: bip32ToAddressNList(toPath({ ...bip44Params, index })),
        coin: this.coinName,
        scriptType: accountTypeToScriptType[accountType],
        showDisplay: showOnDevice,
      })

      if (!address) throw new Error('UtxoBaseAdapter: no address available from wallet')

      return address
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendTransaction({
    value,
    to,
    wallet,
    bip44Params = this.defaultBIP44Params,
    chainSpecific: { satoshiPerByte, accountType, opReturnData },
    sendMax = false,
  }: BuildSendTxInput<T>): Promise<{ txToSign: ChainTxType<T> }> {
    try {
      this.assertIsAccountTypeSupported(accountType)

      if (!value) throw new Error('value is required')
      if (!to) throw new Error('to is required')

      if (!supportsBTC(wallet)) {
        throw new Error(`UtxoBaseAdapter: wallet does not support ${this.coinName}`)
      }

      const { xpub } = await this.getPublicKey(wallet, bip44Params, accountType)
      const utxos = await this.providers.http.getUtxos({ pubkey: xpub })

      const coinSelectResult = utxoSelect({
        utxos,
        to,
        satoshiPerByte,
        sendMax,
        value,
        opReturnData,
      })

      if (!coinSelectResult?.inputs || !coinSelectResult?.outputs) {
        throw new Error(`UtxoBaseAdapter: coinSelect didn't select coins`)
      }

      const { inputs, outputs } = coinSelectResult

      const signTxInputs: BTCSignTxInput[] = []
      for (const input of inputs) {
        if (!input.path) continue

        const data = await this.providers.http.getTransaction({ txid: input.txid })

        signTxInputs.push({
          addressNList: bip32ToAddressNList(input.path),
          scriptType: accountTypeToScriptType[accountType],
          amount: String(input.value),
          vout: input.vout,
          txid: input.txid,
          hex: data.hex,
        })
      }

      const { chainSpecific } = await this.getAccount(xpub)
      const { nextChangeAddressIndex } = chainSpecific
      const changePath = toPath({ ...bip44Params, isChange: true, index: nextChangeAddressIndex })

      const signTxOutputs = outputs.map<BTCSignTxOutput>((output) => {
        if (output.address) {
          return {
            addressType: BTCOutputAddressType.Spend,
            amount: String(output.value),
            address: output.address,
          }
        }

        return {
          addressType: BTCOutputAddressType.Change,
          amount: String(output.value),
          addressNList: bip32ToAddressNList(changePath),
          scriptType: accountTypeToOutputScriptType[accountType],
          isChange: true,
        }
      })

      const txToSign = {
        coin: this.coinName,
        inputs: signTxInputs,
        outputs: signTxOutputs,
        opReturnData,
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
    sendMax = false,
  }: GetFeeDataInput<T>): Promise<FeeDataEstimate<T>> {
    if (!to) throw new Error('to is required')
    if (!value) throw new Error('value is required')
    if (!pubkey) throw new Error('pubkey is required')

    const data = await this.providers.http.getNetworkFees()

    if (
      !(data.fast?.satsPerKiloByte && data.average?.satsPerKiloByte && data.slow?.satsPerKiloByte)
    ) {
      throw new Error('UtxoBaseAdapter: failed to get fee data')
    }

    // TODO: when does this happen and why?
    if (!data.fast?.satsPerKiloByte || data.fast.satsPerKiloByte < 0) {
      data.fast = data.average
    }

    const utxos = await this.providers.http.getUtxos({ pubkey })

    const utxoSelectInput = { to, value, opReturnData, utxos, sendMax }

    // We have to round because coinselect library uses sats per byte which cant be decimals
    const fastPerByte = String(Math.round(data.fast.satsPerKiloByte / 1024))
    const averagePerByte = String(Math.round(data.average.satsPerKiloByte / 1024))
    const slowPerByte = String(Math.round(data.slow.satsPerKiloByte / 1024))

    const { fee: fastFee } = utxoSelect({ ...utxoSelectInput, satoshiPerByte: fastPerByte })
    const { fee: averageFee } = utxoSelect({ ...utxoSelectInput, satoshiPerByte: averagePerByte })
    const { fee: slowFee } = utxoSelect({ ...utxoSelectInput, satoshiPerByte: slowPerByte })

    return {
      fast: { txFee: String(fastFee), chainSpecific: { satoshiPerByte: fastPerByte } },
      average: { txFee: String(averageFee), chainSpecific: { satoshiPerByte: averagePerByte } },
      slow: { txFee: String(slowFee), chainSpecific: { satoshiPerByte: slowPerByte } },
    } as FeeDataEstimate<T>
  }

  async signTransaction({ txToSign, wallet }: SignTxInput<ChainTxType<T>>): Promise<string> {
    try {
      if (!supportsBTC(wallet)) {
        throw new Error(`UtxoBaseAdapter: wallet does not support ${this.coinName}`)
      }

      const signedTx = await wallet.btcSignTx(txToSign)

      if (!signedTx) throw new Error('UtxoBaseAdapter: error signing tx')

      return signedTx.serializedTx
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse> {
    if (!this.accountAddresses[input.pubkey]) {
      await this.getAccount(input.pubkey)
    }

    const data = await this.providers.http.getTxHistory({
      pubkey: input.pubkey,
      pageSize: input.pageSize,
      cursor: input.cursor,
    })

    const getAddresses = (tx: unchained.utxo.types.Tx): string[] => {
      const addresses: string[] = []

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
          this.accountAddresses[input.pubkey].includes(addr),
        )

        return await Promise.all(
          addresses.map(async (addr) => {
            const parsedTx = await this.parser.parse(tx, addr)

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
              status: parsedTx.status,
              trade: parsedTx.trade,
              transfers: parsedTx.transfers.map((transfer) => ({
                assetId: transfer.assetId,
                from: transfer.from,
                to: transfer.to,
                type: transfer.type,
                value: transfer.totalValue,
              })),
            }
          }),
        )
      }),
    )

    return {
      cursor: data.cursor ?? '',
      pubkey: input.pubkey,
      transactions: txs.flat(),
    }
  }

  async broadcastTransaction(hex: string): Promise<string> {
    return this.providers.http.sendTx({ sendTxBody: { hex } })
  }

  async subscribeTxs(
    input: SubscribeTxsInput,
    onMessage: (msg: Transaction) => void,
    onError: (err: SubscribeError) => void,
  ): Promise<void> {
    const {
      wallet,
      bip44Params = this.defaultBIP44Params,
      accountType = this.defaultUtxoAccountType,
    } = input

    const { xpub } = await this.getPublicKey(wallet, bip44Params, accountType)
    const account = await this.getAccount(xpub)
    const addresses = (account.chainSpecific.addresses ?? []).map((address) => address.pubkey)
    const subscriptionId = `${toRootDerivationPath(bip44Params)}/${accountType}`

    await this.providers.ws.subscribeTxs(
      subscriptionId,
      { topic: 'txs', addresses },
      async (msg) => {
        const tx = await this.parser.parse(msg.data, msg.address)

        onMessage({
          address: tx.address,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.blockTime,
          chainId: tx.chainId,
          confirmations: tx.confirmations,
          fee: tx.fee,
          status: tx.status,
          trade: tx.trade,
          transfers: tx.transfers.map((transfer) => ({
            assetId: transfer.assetId,
            from: transfer.from,
            to: transfer.to,
            type: transfer.type,
            value: transfer.totalValue,
          })),
          txid: tx.txid,
        })
      },
      (err) => onError({ message: err.message }),
    )
  }

  unsubscribeTxs(input?: SubscribeTxsInput): void {
    if (!input) return this.providers.ws.unsubscribeTxs()

    const { bip44Params = this.defaultBIP44Params, accountType = this.defaultUtxoAccountType } =
      input

    const subscriptionId = `${toRootDerivationPath(bip44Params)}/${accountType}`

    this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] })
  }

  closeTxs(): void {
    this.providers.ws.close('txs')
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
    accountType: UtxoAccountType,
  ): Promise<PublicKey> {
    this.assertIsAccountTypeSupported(accountType)

    const path = toRootDerivationPath(bip44Params)
    const publicKeys = await wallet.getPublicKeys([
      {
        coin: this.coinName,
        addressNList: bip32ToAddressNList(path),
        curve: 'secp256k1', // TODO(0xdef1cafe): from constant?
        scriptType: accountTypeToScriptType[accountType],
      },
    ])

    if (!publicKeys?.[0]) throw new Error("couldn't get public key")

    if (accountType) {
      return { xpub: convertXpubVersion(publicKeys[0].xpub, accountType) }
    }

    return publicKeys[0]
  }
}
