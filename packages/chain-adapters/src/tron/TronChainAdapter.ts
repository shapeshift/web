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
import {
  getTronContractCallBandwidthBytes,
  SIGNED_TX_OVERHEAD_BYTES,
  toTronBase58,
  TRON_DEFAULT_FEE_LIMIT_SUN,
} from './utils'

// Base58 of 0x41 + 20 zero bytes; the native-TRX sentinel in DEX token paths and the mint/burn party in TRC20 logs
export const TRON_ZERO_ADDRESS = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'

// The dynamic energy penalty moves at most +20% per 6h cycle, so this covers a full step inside a quote window
export const TRON_ENERGY_SAFETY_MARGIN = 1.2

// A plain TRC20 transfer at twice USDT's penalised cost, for stand-in senders whose simulation says nothing
const TRC20_TRANSFER_FALLBACK_ENERGY = 130_000

// Cost (in sun) to activate a not-yet-existing recipient account.
const TRON_ACCOUNT_ACTIVATION_FEE = 1_000_000 // 1 TRX

const TRC20_TRANSFER_BANDWIDTH_BYTES = 211 + SIGNED_TX_OVERHEAD_BYTES // 345, the standard USDT transfer
const NATIVE_TX_DEFAULT_RAW_BYTES = 133 // raw_data of a plain TransferContract
const NATIVE_TX_DEFAULT_BYTES = NATIVE_TX_DEFAULT_RAW_BYTES + SIGNED_TX_OVERHEAD_BYTES // when the tx can't be built to measure it

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
        value,
        chainSpecific: { contractAddress, memo, feeLimit } = {},
      } = input
      const to = toTronBase58(input.to)

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
          feeLimit: Number(feeLimit) || TRON_DEFAULT_FEE_LIMIT_SUN,
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
    // in sun; the standard 100 TRX when the caller has no estimate to bound it with
    feeLimit?: string
  }): Promise<TronSignTx> {
    try {
      const { from, accountNumber, data, value, feeLimit } = input
      const to = toTronBase58(input.to)

      const callData = data.startsWith('0x') ? data.slice(2) : data
      let txData: TronUnsignedTx

      const requestBody = {
        owner_address: from,
        contract_address: to,
        data: callData,
        fee_limit: Number(feeLimit) || TRON_DEFAULT_FEE_LIMIT_SUN,
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
      const { value, chainSpecific: { from, contractAddress, memo, data } = {} } = input
      const to = toTronBase58(input.to)

      const tronWeb = new TronWeb({ fullHost: this.rpcUrl, headers: this.tronGridHeaders })
      const { bandwidthPrice, energyPrice, memoFee } = await this.providers.http.getChainPrices()

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
        this.estimateActivationFee({ to, contractAddress, data }),
      ])

      const fee = {
        txFee: String(energyFee + bandwidthFee + activationFee + (memo ? memoFee : 0)),
        chainSpecific: { bandwidth: String(Math.ceil(bandwidthFee / bandwidthPrice)) },
      }

      return { fast: fee, average: fee, slow: fee }
    } catch (err) {
      return ErrorHandler(err, { translation: 'chainAdapters.errors.getFeeData' })
    }
  }

  // Energy in sun: none for native transfers, simulated calldata for contract calls, a simulated transfer for TRC20
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

    if (data) {
      const feeInSun = await this.providers.http.estimateContractCallFee({
        contractAddress: to,
        from: from || to,
        data,
        callValue: value,
      })

      return Math.ceil(Number(feeInSun) * TRON_ENERGY_SAFETY_MARGIN)
    }

    try {
      const feeInSun = await this.providers.http.estimateTrc20TransferFee({
        contractAddress: contractAddress as string,
        from: from || to,
        to,
        amount: value,
      })

      return Math.ceil(Number(feeInSun) * TRON_ENERGY_SAFETY_MARGIN)
    } catch (error) {
      // a real sender's revert is a real failure; a stand-in's balance is unknown
      if (from) throw error

      return TRC20_TRANSFER_FALLBACK_ENERGY * energyPrice
    }
  }

  // Bandwidth in sun: calldata-sized for contract calls, fixed plus memo for TRC20, the built tx's size for native
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
    const memoBytes = memo ? Buffer.byteLength(memo, 'utf8') : 0

    if (data) return getTronContractCallBandwidthBytes(data) * bandwidthPrice

    if (contractAddress) return (TRC20_TRANSFER_BANDWIDTH_BYTES + memoBytes) * bandwidthPrice

    // tronweb refuses to build a self-transfer, so a walletless estimate can't measure the real tx
    if (!from || from === to) return (NATIVE_TX_DEFAULT_BYTES + memoBytes) * bandwidthPrice

    try {
      const baseTx = await this.requestQueue.add(
        () => tronWeb.transactionBuilder.sendTrx(to, Number(value), from),
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

      return (rawDataBytes + SIGNED_TX_OVERHEAD_BYTES) * bandwidthPrice
    } catch (err) {
      // the size of a native transfer is arithmetic (send-max estimates with a zero value the builder rejects)
      return (NATIVE_TX_DEFAULT_BYTES + memoBytes) * bandwidthPrice
    }
  }

  // Activation fee (in sun). Sending to a plain address that doesn't exist yet costs 1 TRX; contract
  // recipients never need activation.
  private async estimateActivationFee(params: {
    to: string
    contractAddress?: string
    data?: string
  }): Promise<number> {
    const { to, contractAddress, data } = params

    // Only a native transfer can land on a fresh account
    if (contractAddress || data) return 0

    try {
      const isActivated = await this.requestQueue.add(
        () => this.providers.http.isAccountActivated(to),
        { throwOnTimeout: true },
      )

      return isActivated ? 0 : TRON_ACCOUNT_ACTIVATION_FEE
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

    const isSuccess = tx.ret?.[0]?.contractRet === 'SUCCESS'

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

        // TRX sent along with a contract call (a stake deposit, a swap sell) leaves the caller only if the call succeeds
        if (contract.type === 'TriggerSmartContract' && isSuccess) {
          const { owner_address, contract_address, call_value } = contract.parameter.value

          if (owner_address !== pubkey || !contract_address || !call_value) continue

          nativeTransfers.push({
            assetId: this.assetId,
            from: [owner_address],
            to: [contract_address],
            type: TransferType.Send,
            value: String(call_value),
          })
        }
      }
    }

    // the initiator pays the fee whether or not TRX moved - a contract call burns energy even when it fails
    const isFeePayer = tx.raw_data?.contract?.[0]?.parameter?.value?.owner_address === pubkey

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
      ...(isFeePayer && { fee: { assetId: this.assetId, value: tx.fee || '0' } }),
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

      const trc20Transfers = this.parseTRC20Transfers(tx, pubkey)
      const internalTrxTransfers = this.parseInternalTrxTransfers(tx, pubkey)

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

        // mints and burns are the user's receipt and deduction of a liquid staking token
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

  // Only TRX that reaches or leaves the user counts; contracts moving TRX between themselves inside the user's call are not the user's transfers
  private parseInternalTrxTransfers(
    tx: unchained.tron.TronTx,
    pubkey: string,
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

          if (isDirectSend) {
            transfers.push({
              assetId: this.assetId,
              from: [caller_address],
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
