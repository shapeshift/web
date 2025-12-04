import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, tronAssetId, tronChainId } from '@shapeshiftoss/caip'
import type { HDWallet, TronWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsTron } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
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
  protected parser: unchained.tron.TransactionParser

  constructor(args: ChainAdapterArgs) {
    this.providers = args.providers
    this.rpcUrl = args.rpcUrl

    this.parser = new unchained.tron.TransactionParser({
      assetId: this.assetId,
      chainId: this.chainId,
    })
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

      console.log('[TronChainAdapter] buildSendApiTransaction input:', JSON.stringify({
        from,
        to,
        value,
        contractAddress,
        memo,
        isNativeTRX: !contractAddress,
      }, null, 2))

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
        // Check actual account balance before building transaction
        const accountInfoResponse = await fetch(`${this.rpcUrl}/wallet/getaccount`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: from,
            visible: true,
          }),
        })
        const accountInfo = await accountInfoResponse.json()

        // Also check recipient address to see if it needs activation
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
        const accountActivationCost = recipientExists ? 0 : 1_000_000 // 1 TRX for new accounts

        console.log('[TronChainAdapter] Account balance check:', JSON.stringify({
          senderAddress: from,
          senderBalance: accountInfo.balance,
          senderBalanceTRX: accountInfo.balance ? (accountInfo.balance / 1_000_000).toFixed(6) : '0',
          senderFrozenBalance: accountInfo.frozen?.[0]?.frozen_balance || 0,
          senderFreeNetUsed: accountInfo.free_net_used || 0,
          senderFreeNetLimit: accountInfo.free_net_limit || 0,
          recipientAddress: to,
          recipientExists,
          recipientActivationCost: accountActivationCost,
          recipientActivationCostTRX: (accountActivationCost / 1_000_000).toFixed(1),
          attemptingSend: value,
          attemptingSendTRX: (Number(value) / 1_000_000).toFixed(6),
          totalCostWithActivation: Number(value) + accountActivationCost,
          totalCostWithActivationTRX: ((Number(value) + accountActivationCost) / 1_000_000).toFixed(6),
          senderHasEnoughWithActivation: accountInfo.balance >= (Number(value) + accountActivationCost),
        }, null, 2))

        const requestBody = {
          owner_address: from,
          to_address: to,
          amount: Number(value),
          visible: true,
        }

        console.log('[TronChainAdapter] /wallet/createtransaction request:', JSON.stringify(requestBody, null, 2))

        const response = await fetch(`${this.rpcUrl}/wallet/createtransaction`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })

        txData = await response.json()

        // Calculate actual transaction size if successful
        let actualBandwidth = 0
        if (txData.raw_data_hex) {
          const rawDataBytes = txData.raw_data_hex.length / 2
          const signatureBytes = 65
          actualBandwidth = Math.ceil(rawDataBytes + signatureBytes)
        }

        console.log('[TronChainAdapter] /wallet/createtransaction response:', JSON.stringify({
          hasError: !!txData.Error,
          error: txData.Error,
          hasRawDataHex: !!txData.raw_data_hex,
          actualBandwidthBytes: actualBandwidth,
          actualBandwidthCost: actualBandwidth * 1000,
          actualBandwidthCostTRX: (actualBandwidth * 1000 / 1_000_000).toFixed(6),
          estimatedWas: 198,
          difference: actualBandwidth - 198,
        }, null, 2))

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

      console.log('[TronChainAdapter] getFeeData input:', JSON.stringify({
        to,
        value,
        from,
        contractAddress,
        memo,
        isNativeTRX: !contractAddress,
      }, null, 2))

      // Get live network prices from chain parameters
      const tronWeb = new TronWeb({ fullHost: this.rpcUrl })
      const params = await tronWeb.trx.getChainParameters()
      const bandwidthPrice = params.find(p => p.key === 'getTransactionFee')?.value ?? 1000
      const energyPrice = params.find(p => p.key === 'getEnergyFee')?.value ?? 100

      console.log('[TronChainAdapter] Chain parameters:', JSON.stringify({
        bandwidthPrice,
        energyPrice,
      }, null, 2))

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
          const baseTx = await tronWeb.transactionBuilder.sendTrx(
            to,
            Number(value),
            estimationFrom,
          )

          // Add memo if provided to get accurate size
          const finalTx = memo
            ? await tronWeb.transactionBuilder.addUpdateData(baseTx, memo, 'utf8')
            : baseTx

          // Calculate bandwidth from actual transaction size
          const rawDataBytes = finalTx.raw_data_hex ? finalTx.raw_data_hex.length / 2 : 133
          const signatureBytes = 65
          const totalBytes = rawDataBytes + signatureBytes

          bandwidthFee = totalBytes * bandwidthPrice

          console.log('[TronChainAdapter] Bandwidth calculation:', JSON.stringify({
            rawDataBytes,
            signatureBytes,
            totalBytes,
            bandwidthPrice,
            bandwidthFee,
            usedFrom: estimationFrom,
            actualFrom: from,
            to,
          }, null, 2))
        } catch (err) {
          console.error('[TronChainAdapter] Bandwidth estimation fallback:', err)
          // Fallback bandwidth estimate: Base tx + memo bytes
          const baseBytes = 198
          const memoBytes = memo ? Buffer.from(memo, 'utf8').length : 0
          const totalBytes = baseBytes + memoBytes
          bandwidthFee = totalBytes * bandwidthPrice
        }
      }

      const totalFee = energyFee + bandwidthFee

      // Calculate bandwidth for display
      const estimatedBandwidth = String(Math.ceil(bandwidthFee / bandwidthPrice))

      console.log('[TronChainAdapter] getFeeData result:', JSON.stringify({
        energyFee,
        bandwidthFee,
        totalFee,
        estimatedBandwidth,
        isNativeTRX: !contractAddress,
      }, null, 2))

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
      console.error('[TronChainAdapter] getFeeData error:', err)
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

  async parseTx(tx: unchained.tron.TronTx, pubkey: string): Promise<Transaction> {
    const { address: _, ...parsedTx } = await this.parser.parse(tx, pubkey)

    return {
      ...parsedTx,
      pubkey,
      transfers: parsedTx.transfers.map(transfer => ({
        assetId: transfer.assetId,
        from: [transfer.from],
        to: [transfer.to],
        type: transfer.type,
        value: transfer.totalValue,
      })),
    }
  }

  get httpProvider(): unchained.tron.TronApi {
    return this.providers.http
  }
}
