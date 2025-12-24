import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, tronAssetId, tronChainId } from '@shapeshiftoss/caip'
import type { HDWallet, TronWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsTron } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'
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

export interface ChainAdapterArgs {
  providers: {
    http: unchained.tron.TronApi
  }
  rpcUrl: string
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

  constructor(args: ChainAdapterArgs) {
    this.providers = args.providers
    this.rpcUrl = args.rpcUrl
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
      })

      let txData

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

        txData = await tronWeb.transactionBuilder.triggerSmartContract(
          contractAddress,
          functionSelector,
          options,
          parameter,
          from,
        )

        if (!txData.result || !txData.result.result) {
          throw new Error('Failed to build TRC20 transaction')
        }

        txData = txData.transaction
      } else {
        const requestBody = {
          owner_address: from,
          to_address: to,
          amount: Number(value),
          visible: true,
        }

        const response = await fetch(`${this.rpcUrl}/wallet/createtransaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        txData = await response.json()

        if (txData.Error) {
          throw new Error(`TronGrid API error: ${txData.Error}`)
        }
      }

      // Add memo if provided
      if (memo) {
        txData = await tronWeb.transactionBuilder.addUpdateData(txData, memo, 'utf8')
      }

      if (!txData.raw_data_hex) {
        throw new Error('Failed to create transaction')
      }

      const rawDataHex =
        typeof txData.raw_data_hex === 'string'
          ? txData.raw_data_hex
          : Buffer.isBuffer(txData.raw_data_hex)
          ? txData.raw_data_hex.toString('hex')
          : Array.isArray(txData.raw_data_hex)
          ? Buffer.from(txData.raw_data_hex).toString('hex')
          : (() => {
              throw new Error(`Unexpected raw_data_hex type: ${typeof txData.raw_data_hex}`)
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

  // TODO: CRITICAL - Fix fee estimation for TRC20 tokens
  // Current implementation returns FIXED 0.268 TRX for all transactions
  // Reality: TRC20 transfers cost 6-15 TRX (energy + bandwidth + memo)
  // This causes UI to show wrong fees and transactions to fail on-chain
  // See TRON_FEE_ESTIMATION_ISSUES.md for detailed analysis and fix
  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.TronMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.TronMainnet>> {
    try {
      const { to, value, chainSpecific: { from, contractAddress, memo } = {} } = input

      // Get live network prices from chain parameters
      const tronWeb = new TronWeb({ fullHost: this.rpcUrl })
      const params = await tronWeb.trx.getChainParameters()
      const bandwidthPrice = params.find(p => p.key === 'getTransactionFee')?.value ?? 1000
      const energyPrice = params.find(p => p.key === 'getEnergyFee')?.value ?? 100

      let energyFee = 0
      let bandwidthFee = 0

      if (contractAddress) {
        // TRC20: Estimate energy using existing method
        try {
          // Use sender address if available, otherwise use recipient for estimation
          const estimationFrom = from || to
          const energyEstimate = await this.providers.http.estimateTRC20TransferFee({
            contractAddress,
            from: estimationFrom,
            to,
            amount: value,
          })
          energyFee = Number(energyEstimate)

          // Apply 1.5x safety margin for dynamic energy spikes
          energyFee = Math.ceil(energyFee * 1.5)
        } catch (err) {
          // Fallback: Conservative estimate for new address (130k energy)
          energyFee = 130000 * energyPrice
        }

        // TRC20 transfers use ~276 bytes bandwidth
        bandwidthFee = 276 * bandwidthPrice
      } else {
        // TRX transfer: Build actual transaction to get precise bandwidth
        try {
          // Use actual sender if available, otherwise use recipient for estimation
          const estimationFrom = from || to
          const baseTx = await tronWeb.transactionBuilder.sendTrx(to, Number(value), estimationFrom)

          // Add memo if provided to get accurate size
          const finalTx = memo
            ? await tronWeb.transactionBuilder.addUpdateData(baseTx, memo, 'utf8')
            : baseTx

          // Calculate bandwidth from actual transaction size
          const rawDataBytes = finalTx.raw_data_hex ? finalTx.raw_data_hex.length / 2 : 133
          const signatureBytes = 65
          const totalBytes = rawDataBytes + signatureBytes

          bandwidthFee = totalBytes * bandwidthPrice
        } catch (err) {
          // Fallback bandwidth estimate: Base tx + memo bytes
          const baseBytes = 198
          const memoBytes = memo ? Buffer.from(memo, 'utf8').length : 0
          const totalBytes = baseBytes + memoBytes
          bandwidthFee = totalBytes * bandwidthPrice
        }
      }

      // Check if recipient address needs activation (1 TRX cost)
      let accountActivationFee = 0
      try {
        const recipientInfoResponse = await fetch(`${this.rpcUrl}/wallet/getaccount`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: to,
            visible: true,
          }),
        })
        const recipientInfo = await recipientInfoResponse.json()
        const recipientExists = recipientInfo && Object.keys(recipientInfo).length > 1

        // If recipient doesn't exist, add 1 TRX activation fee
        if (!recipientExists && !contractAddress) {
          accountActivationFee = 1_000_000 // 1 TRX = 1,000,000 sun
        }
      } catch (err) {
        // Don't fail on this check - continue with 0 activation fee
      }

      const totalFee = energyFee + bandwidthFee + accountActivationFee

      // Calculate bandwidth for display
      const estimatedBandwidth = String(Math.ceil(bandwidthFee / bandwidthPrice))

      return {
        fast: {
          txFee: String(totalFee),
          chainSpecific: { bandwidth: estimatedBandwidth },
        },
        average: {
          txFee: String(totalFee),
          chainSpecific: { bandwidth: estimatedBandwidth },
        },
        slow: {
          txFee: String(totalFee),
          chainSpecific: { bandwidth: estimatedBandwidth },
        },
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getFeeData',
      })
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

      console.log('[TRON_FINAL] Combined transfers:', JSON.stringify({
        txid: tx.txid,
        pubkey,
        nativeTransferCount: parsedTx.transfers.length,
        trc20TransferCount: trc20Transfers.length,
        internalTransferCount: internalTrxTransfers.length,
        totalTransferCount: parsedTx.transfers.length + trc20Transfers.length + internalTrxTransfers.length,
        allTransfers: [...parsedTx.transfers, ...trc20Transfers, ...internalTrxTransfers].map(t => ({
          type: t.type,
          assetId: t.assetId,
          from: t.from,
          to: t.to,
          value: t.value,
        })),
      }, null, 2))

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
    console.log('[TRON_TRC20] Entry check:', JSON.stringify({
      txid: tx.txid,
      hasLogs: !!tx.log,
      logCount: tx.log?.length || 0,
      contractRet: tx.ret?.[0]?.contractRet,
      willProcess: tx.log && tx.log.length > 0 && tx.ret?.[0]?.contractRet === 'SUCCESS',
    }, null, 2))

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
    const ZERO_ADDRESS = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'
    const tronWeb = new TronWeb({ fullHost: this.rpcUrl })

    for (const log of tx.log) {
      console.log('[TRON_TRC20] Processing log:', JSON.stringify({
        address: log.address,
        topics: log.topics,
        data: log.data,
        dataLength: log.data?.length,
      }, null, 2))

      try {
        if (!log.topics || log.topics.length !== 3) continue
        if (log.topics[0] !== TRANSFER_EVENT_SIGNATURE) continue
        if (!log.data || log.data.length !== 64) continue

        const fromAddress = tronWeb.address.fromHex('41' + log.topics[1].slice(-40))
        const toAddress = tronWeb.address.fromHex('41' + log.topics[2].slice(-40))

        if (fromAddress === ZERO_ADDRESS || toAddress === ZERO_ADDRESS) continue

        if (fromAddress === toAddress) continue

        const isSend = fromAddress === pubkey
        const isReceive = toAddress === pubkey

        if (!isSend && !isReceive) continue

        const value = BigInt('0x' + log.data).toString()
        const contractAddress = log.address

        console.log('[TRON_TRC20] Parsed transfer:', JSON.stringify({
          fromAddress,
          toAddress,
          pubkey,
          isSend,
          isReceive,
          value,
          contractAddress,
          assetId: `${this.chainId}/trc20:${contractAddress}`,
        }, null, 2))

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
    console.log('[TRON_INTERNAL] Entry check:', JSON.stringify({
      txid: tx.txid,
      hasInternalTx: !!tx.internal_transactions,
      count: tx.internal_transactions?.length || 0,
      contractRet: tx.ret?.[0]?.contractRet,
      txInitiator,
      willProcess: tx.internal_transactions && tx.internal_transactions.length > 0 && tx.ret?.[0]?.contractRet === 'SUCCESS',
    }, null, 2))

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
