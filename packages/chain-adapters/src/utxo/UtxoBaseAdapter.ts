import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import type {
  BTCSignTxInput,
  BTCSignTxOutput,
  HDWallet,
  PublicKey,
} from '@shapeshiftoss/hdwallet-core'
import {
  bip32ToAddressNList,
  BTCOutputAddressType,
  supportsBTC,
} from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds, UtxoAccountType } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import WAValidator from 'multicoin-address-validator'

import type { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import type {
  Account,
  BuildSendTxInput,
  FeeDataEstimate,
  GetBIP44ParamsInput,
  GetFeeDataInput,
  SignTx,
  SignTxInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TxHistoryInput,
  TxHistoryResponse,
  UtxoBuildSendApiTxInput,
  ValidAddressResult,
} from '../types'
import { ValidAddressResultType } from '../types'
import {
  accountTypeToOutputScriptType,
  accountTypeToScriptType,
  chainIdToChainLabel,
  convertXpubVersion,
  toAddressNList,
  toRootDerivationPath,
} from '../utils'
import { bnOrZero } from '../utils/bignumber'
import type { bitcoin, bitcoincash, dogecoin, litecoin } from './'
import type { GetAddressInput } from './types'
import { utxoSelect } from './utxoSelect'

export const utxoChainIds = [
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.BitcoinCashMainnet,
  KnownChainIds.DogecoinMainnet,
  KnownChainIds.LitecoinMainnet,
] as const

export type UtxoChainId = typeof utxoChainIds[number]

export type UtxoChainAdapter =
  | bitcoin.ChainAdapter
  | bitcoincash.ChainAdapter
  | dogecoin.ChainAdapter
  | litecoin.ChainAdapter

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
  assetId: AssetId
  chainId: UtxoChainId
  defaultBIP44Params: BIP44Params
  defaultUtxoAccountType: UtxoAccountType
  parser: unchained.utxo.BaseTransactionParser<unchained.utxo.types.Tx>
  supportedAccountTypes: UtxoAccountType[]
  supportedChainIds: ChainId[]
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
    this.assetId = args.assetId
    this.chainId = args.chainId
    this.coinName = args.coinName
    this.defaultBIP44Params = args.defaultBIP44Params
    this.defaultUtxoAccountType = args.defaultUtxoAccountType
    this.parser = args.parser
    this.providers = args.providers
    this.supportedAccountTypes = args.supportedAccountTypes
    this.supportedChainIds = args.supportedChainIds

    if (!this.supportedChainIds.includes(this.chainId)) {
      throw new Error(`${this.chainId} not supported. (supported: ${this.supportedChainIds})`)
    }
  }

  abstract getType(): T
  abstract getFeeAssetId(): AssetId
  abstract getName(): string
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

  getBIP44Params({
    accountNumber,
    accountType,
    index,
    isChange = false,
  }: GetBIP44ParamsInput): BIP44Params {
    if (accountNumber < 0) {
      throw new Error('accountNumber must be >= 0')
    }

    if (index !== undefined && index < 0) {
      throw new Error('index must be >= 0')
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
    return { ...this.defaultBIP44Params, accountNumber, purpose, isChange, index }
  }

  async getAccount(pubkey: string): Promise<Account<T>> {
    try {
      const data = await this.providers.http.getAccount({ pubkey })

      const balance = bnOrZero(data.balance).plus(bnOrZero(data.unconfirmedBalance))

      // cache addresses for getTxHistory to use without needing to make extra requests
      this.accountAddresses[data.pubkey] = data.addresses?.map(address => address.pubkey) ?? [
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
    accountNumber,
    accountType = this.defaultUtxoAccountType,
    index,
    isChange = false,
    showOnDevice = false,
  }: GetAddressInput): Promise<string> {
    try {
      this.assertIsAccountTypeSupported(accountType)

      if (!supportsBTC(wallet)) {
        throw new Error(`UtxoBaseAdapter: wallet does not support ${this.coinName}`)
      }

      const bip44Params = this.getBIP44Params({ accountNumber, accountType, isChange, index })

      const getNextIndex = async () => {
        const { xpub } = await this.getPublicKey(wallet, accountNumber, accountType)
        const account = await this.getAccount(xpub)

        return bip44Params.isChange
          ? account.chainSpecific.nextChangeAddressIndex
          : account.chainSpecific.nextReceiveAddressIndex
      }

      const maybeNextIndex = bip44Params.index ?? (await getNextIndex())
      const address = await wallet.btcGetAddress({
        addressNList: toAddressNList({ ...bip44Params, index: maybeNextIndex }),
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

  async buildSendApiTransaction(input: UtxoBuildSendApiTxInput<T>): Promise<SignTx<T>> {
    try {
      const { value, to, xpub, accountNumber, sendMax = false, chainSpecific } = input
      const { from, satoshiPerByte, accountType, opReturnData } = chainSpecific

      if (!value) throw new Error('value is required')
      if (!to) throw new Error('to is required')
      if (!satoshiPerByte) throw new Error('satoshiPerByte is required')

      this.assertIsAccountTypeSupported(accountType)

      const bip44Params = this.getBIP44Params({ accountNumber, accountType })

      const utxos = await this.providers.http.getUtxos({ pubkey: xpub })

      const coinSelectResult = utxoSelect({
        utxos,
        from,
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

      const account = await this.getAccount(xpub)
      const index = account.chainSpecific.nextChangeAddressIndex
      const addressNList = toAddressNList({ ...bip44Params, isChange: true, index })

      const signTxOutputs = outputs.map<BTCSignTxOutput>(output => {
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
          addressNList,
          scriptType: accountTypeToOutputScriptType[accountType],
          isChange: true,
        }
      })

      const txToSign = {
        coin: this.coinName,
        inputs: signTxInputs,
        outputs: signTxOutputs,
        opReturnData,
      } as SignTx<T>

      return txToSign
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<T>): Promise<{ txToSign: SignTx<T> }> {
    try {
      const { wallet, accountNumber, chainSpecific } = input

      if (!supportsBTC(wallet)) {
        throw new Error(`UtxoBaseAdapter: wallet does not support ${this.coinName}`)
      }

      const { xpub } = await this.getPublicKey(wallet, accountNumber, chainSpecific.accountType)
      const txToSign = await this.buildSendApiTransaction({ ...input, xpub })

      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getFeeData({
    to,
    value,
    chainSpecific: { from, pubkey, opReturnData },
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

    const utxoSelectInput = { from, to, value, opReturnData, utxos, sendMax }

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

  async signTransaction({ txToSign, wallet }: SignTxInput<SignTx<T>>): Promise<string> {
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

      tx.vin?.forEach(vin => {
        if (!vin.addresses) return
        addresses.push(...vin.addresses)
      })

      tx.vout?.forEach(vout => {
        if (!vout.addresses) return
        addresses.push(...vout.addresses)
      })

      return [...new Set(addresses)]
    }

    const txs = await Promise.all(
      (data.txs ?? []).map(tx => {
        const addresses = getAddresses(tx).filter(addr =>
          this.accountAddresses[input.pubkey].includes(addr),
        )

        return Promise.all(
          addresses.map(async addr => {
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
              transfers: parsedTx.transfers.map(transfer => ({
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

  broadcastTransaction(hex: string): Promise<string> {
    return this.providers.http.sendTx({ sendTxBody: { hex } })
  }

  async subscribeTxs(
    input: SubscribeTxsInput,
    onMessage: (msg: Transaction) => void,
    onError: (err: SubscribeError) => void,
  ): Promise<void> {
    const { wallet, accountNumber, accountType = this.defaultUtxoAccountType } = input

    const bip44Params = this.getBIP44Params({ accountNumber, accountType })
    const { xpub } = await this.getPublicKey(wallet, accountNumber, accountType)
    const account = await this.getAccount(xpub)
    const addresses = (account.chainSpecific.addresses ?? []).map(address => address.pubkey)
    const subscriptionId = `${toRootDerivationPath(bip44Params)}/${accountType}`

    await this.providers.ws.subscribeTxs(
      subscriptionId,
      { topic: 'txs', addresses },
      async msg => {
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
          transfers: tx.transfers.map(transfer => ({
            assetId: transfer.assetId,
            from: transfer.from,
            to: transfer.to,
            type: transfer.type,
            value: transfer.totalValue,
          })),
          txid: tx.txid,
        })
      },
      err => onError({ message: err.message }),
    )
  }

  unsubscribeTxs(input?: SubscribeTxsInput): void {
    if (!input) return this.providers.ws.unsubscribeTxs()

    const { accountNumber, accountType = this.defaultUtxoAccountType } = input
    const bip44Params = this.getBIP44Params({ accountNumber, accountType })
    const subscriptionId = `${toRootDerivationPath(bip44Params)}/${accountType}`

    this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] })
  }

  closeTxs(): void {
    this.providers.ws.close('txs')
  }

  // eslint-disable-next-line require-await
  async validateAddress(address: string): Promise<ValidAddressResult> {
    const chainLabel = chainIdToChainLabel(this.chainId)
    const isValidAddress = WAValidator.validate(address, chainLabel)
    if (isValidAddress) return { valid: true, result: ValidAddressResultType.Valid }
    return { valid: false, result: ValidAddressResultType.Invalid }
  }

  async getPublicKey(
    wallet: HDWallet,
    accountNumber: number,
    accountType: UtxoAccountType,
  ): Promise<PublicKey> {
    this.assertIsAccountTypeSupported(accountType)

    const bip44Params = this.getBIP44Params({ accountNumber, accountType })
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
