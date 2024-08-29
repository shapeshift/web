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
import PQueue from 'p-queue'

import type { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import type {
  Account,
  BroadcastTransactionInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetBIP44ParamsInput,
  GetFeeDataInput,
  SignAndBroadcastTransactionInput,
  SignTx,
  SignTxInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TransferType,
  TxHistoryInput,
  TxHistoryResponse,
  TxTransfer,
  UtxoBuildSendApiTxInput,
  ValidAddressResult,
} from '../types'
import { CONTRACT_INTERACTION, ValidAddressResultType } from '../types'
import {
  accountTypeToOutputScriptType,
  accountTypeToScriptType,
  chainIdToChainLabel,
  convertXpubVersion,
  toAddressNList,
  toRootDerivationPath,
} from '../utils'
import { bn, bnOrZero } from '../utils/bignumber'
import { assertAddressNotSanctioned } from '../utils/validateAddress'
import type { bitcoin, bitcoincash, dogecoin, litecoin } from './'
import type { GetAddressInput, GetUtxosInput } from './types'
import { getAddresses } from './utils'
import { utxoSelect } from './utxoSelect'

export const utxoChainIds = [
  KnownChainIds.BitcoinMainnet,
  KnownChainIds.BitcoinCashMainnet,
  KnownChainIds.DogecoinMainnet,
  KnownChainIds.LitecoinMainnet,
] as const

export type UtxoChainId = (typeof utxoChainIds)[number]

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
  midgardUrl: string
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
    pubKey,
  }: GetAddressInput): Promise<string> {
    try {
      this.assertIsAccountTypeSupported(accountType)

      if (!supportsBTC(wallet)) {
        throw new Error(`UtxoBaseAdapter: wallet does not support ${this.coinName}`)
      }

      const bip44Params = this.getBIP44Params({ accountNumber, accountType, isChange, index })

      const account = await (async () => {
        if (pubKey || bip44Params.index === undefined) {
          return this.getAccount(
            pubKey ?? (await this.getPublicKey(wallet, accountNumber, accountType)).xpub,
          )
        }
      })()

      const nextIndex = bip44Params.isChange
        ? account?.chainSpecific.nextChangeAddressIndex
        : account?.chainSpecific.nextReceiveAddressIndex

      const targetIndex = bip44Params.index ?? nextIndex ?? 0

      const address = await (() => {
        if (pubKey) return account?.chainSpecific.addresses?.[targetIndex]?.pubkey

        return wallet.btcGetAddress({
          addressNList: toAddressNList({ ...bip44Params, index: targetIndex }),
          coin: this.coinName,
          scriptType: accountTypeToScriptType[accountType],
          showDisplay: showOnDevice,
        })
      })()

      if (!address) throw new Error('UtxoBaseAdapter: no address available from wallet')

      return address
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendApiTransaction(input: UtxoBuildSendApiTxInput<T>): Promise<SignTx<T>> {
    try {
      const {
        value,
        to,
        xpub,
        accountNumber,
        sendMax = false,
        chainSpecific,
        skipToAddressValidation,
      } = input
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

      const account = await this.getAccount(xpub)

      // Always validate next change and receive addresses
      const nextChangeAddressIndex = account.chainSpecific.nextChangeAddressIndex ?? 0
      const nextReceiveAddressIndex = account.chainSpecific.nextReceiveAddressIndex ?? 0
      const nextChangeAddressInput = {
        address: account.chainSpecific.addresses?.[nextChangeAddressIndex]?.pubkey,
      }
      const nextReceiveAddressInput = {
        address: account.chainSpecific.addresses?.[nextReceiveAddressIndex]?.pubkey,
      }

      const addresses = [...inputs, ...outputs, nextChangeAddressInput, nextReceiveAddressInput]
        .map(({ address }) => (skipToAddressValidation && address === to ? null : address))
        .filter(Boolean) as string[]

      const uniqueAddresses = [...new Set(addresses)]

      await Promise.all(uniqueAddresses.map(assertAddressNotSanctioned))

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
      const { checkLedgerAppOpenIfLedgerConnected, wallet, accountNumber, chainSpecific } = input

      if (!supportsBTC(wallet)) {
        throw new Error(`UtxoBaseAdapter: wallet does not support ${this.coinName}`)
      }

      await checkLedgerAppOpenIfLedgerConnected(this.chainId)
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

    // ensure higher confirmation speeds never have lower fees than lower confirmation speeds
    if (data.slow.satsPerKiloByte > data.average.satsPerKiloByte)
      data.average.satsPerKiloByte = data.slow.satsPerKiloByte
    if (data.average.satsPerKiloByte > data.fast.satsPerKiloByte)
      data.fast.satsPerKiloByte = data.average.satsPerKiloByte

    const utxos = await this.providers.http.getUtxos({ pubkey })

    const utxoSelectInput = { from, to, value, opReturnData, utxos, sendMax }

    // We have to round because coinselect library uses sats per byte which cant be decimals
    const fastPerByte = String(Math.round(data.fast.satsPerKiloByte / 1000))
    const averagePerByte = String(Math.round(data.average.satsPerKiloByte / 1000))
    const slowPerByte = String(Math.round(data.slow.satsPerKiloByte / 1000))

    const { fee: fastFee } = utxoSelect({ ...utxoSelectInput, satoshiPerByte: fastPerByte })
    const { fee: averageFee } = utxoSelect({ ...utxoSelectInput, satoshiPerByte: averagePerByte })
    const { fee: slowFee } = utxoSelect({ ...utxoSelectInput, satoshiPerByte: slowPerByte })

    return {
      fast: { txFee: String(fastFee), chainSpecific: { satoshiPerByte: fastPerByte } },
      average: { txFee: String(averageFee), chainSpecific: { satoshiPerByte: averagePerByte } },
      slow: { txFee: String(slowFee), chainSpecific: { satoshiPerByte: slowPerByte } },
    } as FeeDataEstimate<T>
  }

  async signTransaction({
    checkLedgerAppOpenIfLedgerConnected,
    txToSign,
    wallet,
  }: SignTxInput<SignTx<T>>): Promise<string> {
    try {
      if (!supportsBTC(wallet)) {
        throw new Error(`UtxoBaseAdapter: wallet does not support ${this.coinName}`)
      }

      await checkLedgerAppOpenIfLedgerConnected(this.chainId)
      const signedTx = await wallet.btcSignTx(txToSign)

      if (!signedTx?.serializedTx) throw new Error('UtxoBaseAdapter: error signing tx')

      return signedTx.serializedTx
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async signAndBroadcastTransaction({
    senderAddress,
    receiverAddress,
    signTxInput,
  }: SignAndBroadcastTransactionInput<T>): Promise<string> {
    await (receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress))

    try {
      const { wallet } = signTxInput

      if (!supportsBTC(wallet)) {
        throw new Error(`UtxoBaseAdapter: wallet does not support ${this.coinName}`)
      }
      const hex = await this.signTransaction(signTxInput)

      return this.broadcastTransaction({ senderAddress, receiverAddress, hex })
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse> {
    const requestQueue = input.requestQueue ?? new PQueue()

    if (!this.accountAddresses[input.pubkey]) {
      await requestQueue.add(() => this.getAccount(input.pubkey))
    }

    const data = await requestQueue.add(() =>
      this.providers.http.getTxHistory({
        pubkey: input.pubkey,
        pageSize: input.pageSize,
        cursor: input.cursor,
      }),
    )

    const transactions = await Promise.all(
      data.txs.map(tx => requestQueue.add(() => this.parseTx(tx, input.pubkey))),
    )

    return {
      cursor: data.cursor ?? '',
      pubkey: input.pubkey,
      transactions,
    }
  }

  async broadcastTransaction({ receiverAddress, hex }: BroadcastTransactionInput): Promise<string> {
    await (receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress))

    return this.providers.http.sendTx({ sendTxBody: { hex } })
  }

  async subscribeTxs(
    input: SubscribeTxsInput,
    onMessage: (msg: Transaction) => void,
    onError: (err: SubscribeError) => void,
  ): Promise<void> {
    const { wallet, accountNumber, accountType = this.defaultUtxoAccountType } = input

    const bip44Params = this.getBIP44Params({ accountNumber, accountType })
    const account = await this.getAccount(
      input.pubKey ?? (await this.getPublicKey(wallet, accountNumber, accountType)).xpub,
    )
    const addresses = (account.chainSpecific.addresses ?? []).map(address => address.pubkey)
    const subscriptionId = `${toRootDerivationPath(bip44Params)}/${accountType}`

    await this.providers.ws.subscribeTxs(
      subscriptionId,
      { topic: 'txs', addresses },
      async msg => onMessage(await this.parseTx(msg.data, account.pubkey)),
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

  async getUtxos(input: GetUtxosInput): Promise<unchained.utxo.types.Utxo[]> {
    const utxos = await this.providers.http.getUtxos(input)
    return utxos
  }

  async parseTx(tx: unchained.utxo.types.Tx, pubkey: string): Promise<Transaction> {
    const {
      ownedAddresses,
      ownedSendAddresses,
      unownedReceiveAddresses,
      receiveAddresses,
      sendAddresses,
      ownedReceiveAddresses,
    } = getAddresses(tx, this.accountAddresses[pubkey])

    // a send transaction where all outputs are sent to owned addresses
    const isSelfSend =
      ownedSendAddresses.length &&
      receiveAddresses.every(address => ownedAddresses.includes(address))

    let transaction = {} as Omit<Transaction, 'transfers'>
    const transfers: Record<TransferType, TxTransfer[]> = { Contract: [], Send: [], Receive: [] }
    for (const address of ownedAddresses) {
      const { address: _, ...parsedTx } = await this.parser.parse(tx, address)

      // create transaction object with all shared properties
      if (!Object.keys(transaction).length) {
        transaction = { ...parsedTx, pubkey }
      }

      // add fee if it exists on any of the parsed transactions
      if (parsedTx.fee) transaction.fee = parsedTx.fee

      parsedTx.transfers.forEach(transfer => {
        if (!transfers['Send'][0] && transfer.type === 'Send') {
          // calculate total output amount excluding change (unless self send)
          const totalOutput = tx.vout.reduce((prev, vout) => {
            const isOwnedOutput = vout.addresses?.some(address => ownedAddresses.includes(address))

            if (isOwnedOutput && !isSelfSend) return prev

            return prev.plus(vout.value)
          }, bn(0))

          transfers[transfer.type][0] = {
            assetId: transfer.assetId,
            from: sendAddresses,
            to: isSelfSend ? ownedReceiveAddresses : unownedReceiveAddresses,
            type: transfer.type,
            value: totalOutput.toString(),
          }
        }

        if (transfer.type === 'Receive') {
          const isChange =
            ownedSendAddresses.length &&
            receiveAddresses.filter(address => ownedAddresses.includes(address)).length === 1

          // exclude change outputs (unless self send)
          if (isChange && !isSelfSend) return

          transfers[transfer.type].push({
            assetId: transfer.assetId,
            from: sendAddresses,
            to: [transfer.to],
            type: transfer.type,
            value: transfer.totalValue,
          })
        }
      })
    }

    return Object.assign(transaction, { transfers: Object.values(transfers).flat() })
  }
}
