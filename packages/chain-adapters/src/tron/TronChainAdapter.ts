import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, tronAssetId, tronChainId } from '@shapeshiftoss/caip'
import type { HDWallet, TronWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsTron } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
import PQueue from 'p-queue'
import { TronWeb } from 'tronweb'

import type { ChainAdapter as IChainAdapter } from '../api'
import { ChainAdapterError, ErrorHandler } from '../error/ErrorHandler'
import type {
  Account,
  BroadcastTransactionInput,
  BuildSendApiTxInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetBip44ParamsInput,
  GetFeeDataInput,
  SignAndBroadcastTransactionInput,
  SignTxInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TxHistoryInput,
  TxHistoryResponse,
  ValidAddressResult,
} from '../types'
import { ChainAdapterDisplayName, CONTRACT_INTERACTION, ValidAddressResultType } from '../types'
import { toAddressNList } from '../utils'
import { verifyLedgerAppOpen } from '../utils/ledgerAppGate'
import { assertAddressNotSanctioned } from '../utils/validateAddress'
import type { TronSignTx, TronUnsignedTx } from './types'

// Tron zero address (0x41 + 20 zero bytes, base58). Doubles as the native-TRX sentinel in DEX token
// paths and marks mints/burns in TRC20 transfer logs.
export const TRON_ZERO_ADDRESS = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'

// Safety margin over the simulated energy estimate, covering the dynamic energy penalty drifting
// between quote and execution. Underestimating burns the user's TRX on an OUT_OF_ENERGY revert.
const TRON_ENERGY_SAFETY_MARGIN = 1.5

// Conservative fallback for a plain TRC20 transfer when estimation fails (transfers are predictable
// and cheap, so a fixed fallback is safe here - unlike contract calls, which throw instead).
const TRC20_TRANSFER_FALLBACK_ENERGY = 130_000

// Cost (in sun) to activate a not-yet-existing recipient account.
const TRON_ACCOUNT_ACTIVATION_FEE = 1_000_000 // 1 TRX

// Bandwidth is the byte size of the signed tx (raw_data + signature). Values measured from real
// mainnet txs; it's cheap (~1 sun/byte) and often covered by the free daily allowance regardless.
const TX_SIGNATURE_BYTES = 65 // ECDSA recoverable signature
const TRC20_TRANSFER_BANDWIDTH_BYTES = 276 // measured TRC20 transfer: 211 raw_data + 65 sig
const CONTRACT_CALL_OVERHEAD_BYTES = 208 // envelope + signature on top of the calldata (measured: 143 + 65)
const NATIVE_TX_DEFAULT_RAW_BYTES = 133 // raw_data fallback when a built tx omits raw_data_hex
const NATIVE_TX_FALLBACK_BYTES = 198 // full-tx fallback when building the tx to measure it fails

export interface ChainAdapterArgs {
  providers: {
    http: unchained.tron.TronApi
  }
  rpcUrl: string
  apiKey?: string
}

export class ChainAdapter implements IChainAdapter<KnownChainIds.TronMainnet> {
  static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Tron),
    accountNumber: 0,
  }

  protected readonly chainId = tronChainId
  protected readonly assetId = tronAssetId

  protected readonly providers: {
    http: unchained.tron.TronApi
  }

  protected readonly rpcUrl: string
  private readonly apiKey: string
  private requestQueue: PQueue

  constructor(args: ChainAdapterArgs) {
    this.providers = args.providers
    this.rpcUrl = args.rpcUrl
    this.apiKey = args.apiKey ?? ''
    this.requestQueue = new PQueue({
      intervalCap: 1,
      interval: 400,
      concurrency: 1,
    })
  }

  private get tronGridHeaders(): Record<string, string> {
    return this.apiKey ? { 'TRON-PRO-API-KEY': this.apiKey } : {}
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is TronWallet {
    if (!supportsTron(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(ChainAdapterDisplayName.Tron)
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Tron
  }

  getType(): KnownChainIds.TronMainnet {
    return KnownChainIds.TronMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  getChainId(): ChainId {
    return this.chainId
  }

  getBip44Params({ accountNumber }: GetBip44ParamsInput): Bip44Params {
    if (accountNumber < 0) throw new Error('accountNumber must be >= 0')
    return {
      ...ChainAdapter.rootBip44Params,
      accountNumber,
      isChange: false,
      addressIndex: 0,
    }
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    try {
      const { accountNumber, pubKey, wallet, showOnDevice = false } = input

      if (pubKey) return pubKey

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      await verifyLedgerAppOpen(this.chainId, wallet)

      const address = await wallet.tronGetAddress({
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        showDisplay: showOnDevice,
      })

      if (!address) throw new Error('error getting address from wallet')

      return address
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAddress',
      })
    }
  }

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.TronMainnet>> {
    try {
      const data = await this.providers.http.getAccount({ pubkey })

      const balance = BigInt(data.balance) + BigInt(data.unconfirmedBalance)

      const tokens = (data.tokens ?? [])
        .filter(token => token.balance !== '0')
        .map(token => {
          // Detect if it's TRC10 (numeric ID) or TRC20 (base58 address starting with T)
          const isTRC20 = token.contractAddress.startsWith('T')
          const assetNamespace = isTRC20 ? 'trc20' : 'trc10'

          return {
            assetId: `${this.chainId}/${assetNamespace}:${token.contractAddress}` as AssetId,
            balance: token.balance,
            symbol: '',
            name: '',
            precision: 6,
          }
        })

      return {
        balance: balance.toString(),
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        pubkey,
        chainSpecific: { tokens },
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAccount',
        options: { pubkey },
      })
    }
  }

  getTxHistory(_input: TxHistoryInput): Promise<TxHistoryResponse> {
    throw new Error('Transaction history is not supported for TRON')
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.TronMainnet>,
  ): Promise<TronSignTx> {
    try {
      const {
        from,
        accountNumber,
        to,
        value,
        chainSpecific: { contractAddress, memo } = {},
      } = input

      // Create TronWeb instance once and reuse
      const tronWeb = new TronWeb({
        fullHost: this.rpcUrl,
        headers: this.tronGridHeaders,
      })

      let txData: TronUnsignedTx

      if (contractAddress) {
        // Build TRC20 transfer transaction
        const parameter = [
          { type: 'address', value: to },
          { type: 'uint256', value },
        ]

        const functionSelector = 'transfer(address,uint256)'

        const options = {
          feeLimit: 100_000_000, // 100 TRX standard limit
          callValue: 0,
        }

        const result = await this.requestQueue.add(
          () =>
            tronWeb.transactionBuilder.triggerSmartContract(
              contractAddress,
              functionSelector,
              options,
              parameter,
              from,
            ),
          { throwOnTimeout: true },
        )

        if (!result.result || !result.result.result) {
          throw new Error('Failed to build TRC20 transaction')
        }

        txData = result.transaction
      } else {
        const requestBody = {
          owner_address: from,
          to_address: to,
          amount: Number(value),
          visible: true,
        }

        const response = await this.requestQueue.add(
          () =>
            fetch(`${this.rpcUrl}/wallet/createtransaction`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...this.tronGridHeaders },
              body: JSON.stringify(requestBody),
            }),
          { throwOnTimeout: true },
        )

        const responseData = await response.json()

        if (responseData.Error) {
          throw new Error(`TronGrid API error: ${responseData.Error}`)
        }

        txData = responseData as TronUnsignedTx
      }

      // Add memo if provided
      if (memo) {
        txData = (await this.requestQueue.add(
          () => tronWeb.transactionBuilder.addUpdateData(txData as any, memo, 'utf8'),
          { throwOnTimeout: true },
        )) as TronUnsignedTx
      }

      if (!txData.raw_data_hex) {
        throw new Error('Failed to create transaction')
      }

      const rawDataHexValue: any = txData.raw_data_hex
      const rawDataHex =
        typeof rawDataHexValue === 'string'
          ? rawDataHexValue
          : Buffer.isBuffer(rawDataHexValue)
          ? rawDataHexValue.toString('hex')
          : Array.isArray(rawDataHexValue)
          ? Buffer.from(rawDataHexValue).toString('hex')
          : (() => {
              throw new Error(`Unexpected raw_data_hex type: ${typeof rawDataHexValue}`)
            })()

      if (!/^[0-9a-fA-F]+$/.test(rawDataHex)) {
        throw new Error(`Invalid raw_data_hex format: ${rawDataHex.slice(0, 100)}`)
      }

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        rawDataHex,
        transaction: txData,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildCustomApiTx(input: {
    from: string
    to: string
    accountNumber: number
    data: string
    value: string
    method?: string
    args?: { type: string; value: unknown }[]
  }): Promise<TronSignTx> {
    try {
      const { from, to, accountNumber, data, value } = input

      // Always use raw data field instead of method/args to ensure correct method selector
      // TronWeb's triggerSmartContract computes method selectors differently than expected
      const callData = data.startsWith('0x') ? data.slice(2) : data
      let txData: TronUnsignedTx

      const requestBody = {
        owner_address: from,
        contract_address: to,
        data: callData,
        fee_limit: 100_000_000,
        call_value: Number(value) || 0,
        visible: true,
      }

      const response = await this.requestQueue.add(
        () =>
          fetch(`${this.rpcUrl}/wallet/triggersmartcontract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this.tronGridHeaders },
            body: JSON.stringify(requestBody),
          }),
        { throwOnTimeout: true },
      )

      const result = await response.json()

      if (result.Error || !result.transaction) {
        throw new Error(`TronGrid API error: ${result.Error || 'No transaction returned'}`)
      }

      txData = result.transaction

      if (!txData.raw_data_hex) {
        throw new Error('Failed to create transaction')
      }

      const rawDataHexValue = txData.raw_data_hex
      const rawDataHex =
        typeof rawDataHexValue === 'string'
          ? rawDataHexValue
          : Buffer.isBuffer(rawDataHexValue)
          ? (rawDataHexValue as Buffer).toString('hex')
          : Array.isArray(rawDataHexValue)
          ? Buffer.from(rawDataHexValue).toString('hex')
          : (() => {
              throw new Error(`Unexpected raw_data_hex type: ${typeof rawDataHexValue}`)
            })()

      if (!/^[0-9a-fA-F]+$/.test(rawDataHex)) {
        throw new Error(`Invalid raw_data_hex format: ${rawDataHex.slice(0, 100)}`)
      }

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        rawDataHex,
        transaction: txData,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<KnownChainIds.TronMainnet>): Promise<{
    txToSign: TronSignTx
  }> {
    try {
      const from = await this.getAddress(input)
      const txToSign = await this.buildSendApiTransaction({ ...input, from })

      return { txToSign: { ...txToSign, ...(input.pubKey ? { pubKey: input.pubKey } : {}) } }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async signTransaction(signTxInput: SignTxInput<TronSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      const signedTx = await wallet.tronSignTx(txToSign)

      if (!signedTx?.serialized) throw new Error('error signing tx')
      if (!signedTx?.signature) throw new Error('error getting signature')

      const signedTxObject: TronUnsignedTx & { signature: string[] } = {
        ...txToSign.transaction,
        signature: [signedTx.signature],
      }

      return JSON.stringify(signedTxObject)
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signTransaction',
      })
    }
  }

  async signAndBroadcastTransaction({
    senderAddress,
    receiverAddress,
    signTxInput,
  }: SignAndBroadcastTransactionInput<KnownChainIds.TronMainnet>): Promise<string> {
    try {
      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      const signedTx = await this.signTransaction(signTxInput as SignTxInput<TronSignTx>)

      return await this.broadcastTransaction({
        senderAddress,
        receiverAddress,
        hex: signedTx,
      })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signAndBroadcastTransaction',
      })
    }
  }

  async broadcastTransaction({
    senderAddress,
    receiverAddress,
    hex,
  }: BroadcastTransactionInput): Promise<string> {
    try {
      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      const txHash = await this.providers.http.sendTx({ sendTxBody: { hex } })

      return txHash
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.TronMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.TronMainnet>> {
    try {
      const { to, value, chainSpecific: { from, contractAddress, memo, data } = {} } = input

      const tronWeb = new TronWeb({ fullHost: this.rpcUrl, headers: this.tronGridHeaders })
      const params = await this.requestQueue.add(() => tronWeb.trx.getChainParameters(), {
        throwOnTimeout: true,
      })
      const bandwidthPrice = params.find(p => p.key === 'getTransactionFee')?.value ?? 1000
      const energyPrice = params.find(p => p.key === 'getEnergyFee')?.value ?? 100

      const [energyFee, bandwidthFee, activationFee] = await Promise.all([
        this.estimateEnergyFee({ to, from, value, data, contractAddress, energyPrice }),
        this.estimateBandwidthFee({
          to,
          from,
          value,
          memo,
          data,
          contractAddress,
          tronWeb,
          bandwidthPrice,
        }),
        this.estimateActivationFee({ to, contractAddress }),
      ])

      const fee = {
        txFee: String(energyFee + bandwidthFee + activationFee),
        chainSpecific: { bandwidth: String(Math.ceil(bandwidthFee / bandwidthPrice)) },
      }

      return { fast: fee, average: fee, slow: fee }
    } catch (err) {
      return ErrorHandler(err, { translation: 'chainAdapters.errors.getFeeData' })
    }
  }

  // Energy fee (in sun). Native TRX transfers use none. Contract calls simulate their real calldata
  // (a swap/router call is far more energy-intensive than a transfer); TRC20 sends simulate a transfer.
  private async estimateEnergyFee(params: {
    to: string
    from?: string
    value: string
    data?: string
    contractAddress?: string
    energyPrice: number
  }): Promise<number> {
    const { to, from, value, data, contractAddress, energyPrice } = params

    if (!data && !contractAddress) return 0

    // Contract call: throw rather than guess - underestimating a swap call burns the user's TRX on an OUT_OF_ENERGY revert.
    if (data) {
      const feeInSun = await this.providers.http.estimateContractCallFee({
        contractAddress: to,
        from: from || to,
        data,
        callValue: value,
      })

      return Math.ceil(Number(feeInSun) * TRON_ENERGY_SAFETY_MARGIN)
    }

    // TRC20 transfer: predictable and cheap, so a conservative fallback is safe if estimation fails.
    try {
      const feeInSun = await this.providers.http.estimateTrc20TransferFee({
        contractAddress: contractAddress as string,
        from: from || to,
        to,
        amount: value,
      })

      return Math.ceil(Number(feeInSun) * TRON_ENERGY_SAFETY_MARGIN)
    } catch (err) {
      return TRC20_TRANSFER_FALLBACK_ENERGY * energyPrice
    }
  }

  // Bandwidth fee (in sun). Contract calls scale with calldata size, TRC20 transfers are ~fixed, and
  // native TRX transfers build the actual tx to measure it precisely.
  private async estimateBandwidthFee(params: {
    to: string
    from?: string
    value: string
    memo?: string
    data?: string
    contractAddress?: string
    tronWeb: TronWeb
    bandwidthPrice: number
  }): Promise<number> {
    const { to, from, value, memo, data, contractAddress, tronWeb, bandwidthPrice } = params

    if (data) {
      const dataBytes = (data.startsWith('0x') ? data.length - 2 : data.length) / 2
      return (dataBytes + CONTRACT_CALL_OVERHEAD_BYTES) * bandwidthPrice
    }

    if (contractAddress) return TRC20_TRANSFER_BANDWIDTH_BYTES * bandwidthPrice

    try {
      const baseTx = await this.requestQueue.add(
        () => tronWeb.transactionBuilder.sendTrx(to, Number(value), from || to),
        { throwOnTimeout: true },
      )
      const finalTx = memo
        ? await this.requestQueue.add(
            () => tronWeb.transactionBuilder.addUpdateData(baseTx, memo, 'utf8'),
            { throwOnTimeout: true },
          )
        : baseTx

      const rawDataBytes = finalTx.raw_data_hex
        ? finalTx.raw_data_hex.length / 2
        : NATIVE_TX_DEFAULT_RAW_BYTES

      return (rawDataBytes + TX_SIGNATURE_BYTES) * bandwidthPrice
    } catch (err) {
      const memoBytes = memo ? Buffer.from(memo, 'utf8').length : 0
      return (NATIVE_TX_FALLBACK_BYTES + memoBytes) * bandwidthPrice
    }
  }

  // Activation fee (in sun). Sending to a plain address that doesn't exist yet costs 1 TRX; contract
  // recipients never need activation.
  private async estimateActivationFee(params: {
    to: string
    contractAddress?: string
  }): Promise<number> {
    const { to, contractAddress } = params

    if (contractAddress) return 0

    try {
      const response = await this.requestQueue.add(
        () =>
          fetch(`${this.rpcUrl}/wallet/getaccount`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this.tronGridHeaders },
            body: JSON.stringify({ address: to, visible: true }),
          }),
        { throwOnTimeout: true },
      )
      const info = await response.json()
      const exists = info && Object.keys(info).length > 1

      return exists ? 0 : TRON_ACCOUNT_ACTIVATION_FEE
    } catch (err) {
      // assume activation is needed rather than risk underestimating by 1 TRX
      return TRON_ACCOUNT_ACTIVATION_FEE
    }
  }

  validateAddress(address: string): Promise<ValidAddressResult> {
    try {
      if (!address.startsWith('T')) {
        return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
      }

      if (address.length !== 34) {
        return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
      }

      return Promise.resolve({ valid: true, result: ValidAddressResultType.Valid })
    } catch (err) {
      return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
    }
  }

  subscribeTxs(
    _input: SubscribeTxsInput,
    _onMessage: (msg: Transaction) => void,
    _onError: (err: SubscribeError) => void,
  ): Promise<void> {
    return Promise.resolve()
  }

  unsubscribeTxs(_input?: SubscribeTxsInput): void {
    return
  }

  closeTxs(): void {
    return
  }

  private parse(tx: unchained.tron.TronTx, pubkey: string): Transaction {
    const status = tx.confirmations && tx.confirmations > 0 ? TxStatus.Confirmed : TxStatus.Pending

    const nativeTransfers: {
      assetId: AssetId
      from: string[]
      to: string[]
      type: TransferType
      value: string
    }[] = []

    if (tx.raw_data?.contract) {
      for (const contract of tx.raw_data.contract) {
        if (contract.type === 'TransferContract') {
          const { owner_address, to_address, amount } = contract.parameter.value

          if (!owner_address || !to_address) continue

          const value = String(amount || 0)

          if (owner_address === pubkey) {
            nativeTransfers.push({
              assetId: this.assetId,
              from: [owner_address],
              to: [to_address],
              type: TransferType.Send,
              value,
            })
          }

          if (to_address === pubkey) {
            nativeTransfers.push({
              assetId: this.assetId,
              from: [owner_address],
              to: [to_address],
              type: TransferType.Receive,
              value,
            })
          }
        }
      }
    }

    const isSend = nativeTransfers.some(transfer => transfer.type === TransferType.Send)

    return {
      blockHash: tx.blockHash || '',
      blockHeight: tx.blockHeight || 0,
      blockTime: tx.timestamp ? Math.floor(tx.timestamp / 1000) : 0,
      chainId: this.chainId,
      confirmations: tx.confirmations || 0,
      status,
      transfers: nativeTransfers,
      txid: tx.txid,
      pubkey,
      ...(isSend && { fee: { assetId: this.assetId, value: tx.fee || '0' } }),
    }
  }

  async parseTx(txHashOrTx: unknown, pubkey: string): Promise<Transaction> {
    try {
      let tx: unchained.tron.TronTx

      if (typeof txHashOrTx === 'string') {
        const fetchedTx = await this.providers.http.getTransaction({ txid: txHashOrTx })
        if (!fetchedTx) {
          throw new Error(`Transaction not found: ${txHashOrTx}`)
        }
        tx = fetchedTx
      } else {
        tx = txHashOrTx as unchained.tron.TronTx
      }

      const parsedTx = this.parse(tx, pubkey)

      const txInitiator = tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address

      const trc20Transfers = this.parseTRC20Transfers(tx, pubkey)
      const internalTrxTransfers = this.parseInternalTrxTransfers(tx, pubkey, txInitiator)

      return {
        ...parsedTx,
        transfers: [...parsedTx.transfers, ...trc20Transfers, ...internalTrxTransfers],
      }
    } catch (error) {
      throw new Error(`Failed to parse transaction: ${error}`)
    }
  }

  private parseTRC20Transfers(
    tx: unchained.tron.TronTx,
    pubkey: string,
  ): {
    assetId: string
    from: string[]
    to: string[]
    type: TransferType
    value: string
  }[] {
    if (!tx.log || tx.log.length === 0) return []

    if (tx.ret?.[0]?.contractRet !== 'SUCCESS') return []

    const transfers: {
      assetId: string
      from: string[]
      to: string[]
      type: TransferType
      value: string
    }[] = []

    const TRANSFER_EVENT_SIGNATURE =
      'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const tronWeb = new TronWeb({ fullHost: this.rpcUrl, headers: this.tronGridHeaders })

    for (const log of tx.log) {
      try {
        if (!log.topics || log.topics.length !== 3) continue
        if (log.topics[0] !== TRANSFER_EVENT_SIGNATURE) continue
        if (!log.data || log.data.length !== 64) continue

        const fromAddress = tronWeb.address.fromHex('41' + log.topics[1].slice(-40))
        const toAddress = tronWeb.address.fromHex('41' + log.topics[2].slice(-40))

        // Skip mints (from zero address) but allow burns (to zero address) — a burn is a valid
        // deduction e.g. unstaking sTRX burns the token on behalf of the user
        // https://tronscan.org/#/transaction/1aac271797fe4344ff71f33368085073ea22e560815794811f7336120736d77c
        if (fromAddress === TRON_ZERO_ADDRESS) continue

        if (fromAddress === toAddress) continue

        const isSend = fromAddress === pubkey
        const isReceive = toAddress === pubkey

        if (!isSend && !isReceive) continue

        const value = BigInt('0x' + log.data).toString()
        const contractAddress = log.address

        if (isSend) {
          transfers.push({
            assetId: `${this.chainId}/trc20:${contractAddress}`,
            from: [fromAddress],
            to: [toAddress],
            type: TransferType.Send,
            value,
          })
        }

        if (isReceive) {
          transfers.push({
            assetId: `${this.chainId}/trc20:${contractAddress}`,
            from: [fromAddress],
            to: [toAddress],
            type: TransferType.Receive,
            value,
          })
        }
      } catch (error) {
        continue
      }
    }

    return transfers
  }

  private parseInternalTrxTransfers(
    tx: unchained.tron.TronTx,
    pubkey: string,
    txInitiator?: string,
  ): {
    assetId: AssetId
    from: string[]
    to: string[]
    type: TransferType
    value: string
  }[] {
    if (!tx.internal_transactions || tx.internal_transactions.length === 0) return []

    if (tx.ret?.[0]?.contractRet !== 'SUCCESS') return []

    const transfers: {
      assetId: AssetId
      from: string[]
      to: string[]
      type: TransferType
      value: string
    }[] = []

    for (const internalTx of tx.internal_transactions) {
      try {
        if (internalTx.rejected === true) continue

        if (!internalTx.callValueInfo || internalTx.callValueInfo.length === 0) continue

        for (const callInfo of internalTx.callValueInfo) {
          if (callInfo.tokenId) continue

          if (!callInfo.callValue || callInfo.callValue === 0) continue

          const { caller_address, transferTo_address } = internalTx

          if (!caller_address || !transferTo_address) continue

          if (caller_address === transferTo_address) continue

          const value = String(callInfo.callValue)

          const isDirectSend = caller_address === pubkey
          const isDirectReceive = transferTo_address === pubkey
          const isInitiatedByUser = txInitiator === pubkey && caller_address !== pubkey

          if (isDirectSend) {
            transfers.push({
              assetId: this.assetId,
              from: [caller_address],
              to: [transferTo_address],
              type: TransferType.Send,
              value,
            })
          } else if (isInitiatedByUser) {
            transfers.push({
              assetId: this.assetId,
              from: [txInitiator],
              to: [transferTo_address],
              type: TransferType.Send,
              value,
            })
          }

          if (isDirectReceive) {
            transfers.push({
              assetId: this.assetId,
              from: [caller_address],
              to: [transferTo_address],
              type: TransferType.Receive,
              value,
            })
          }
        }
      } catch (error) {
        continue
      }
    }

    return transfers
  }

  get httpProvider(): unchained.tron.TronApi {
    return this.providers.http
  }
}
