import type { AptosClient } from '@aptos-labs/ts-sdk'
import { Aptos, AptosConfig, Network, InputEntryFunctionData } from '@aptos-labs/ts-sdk'
import type { AssetId, ChainId, ASSET_REFERENCE } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  aptosAssetId,
  aptosChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { HDWallet, AptosWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsAptos } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TransferType, TxStatus } from '@shapeshiftoss/unchained-client'

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
  SignTx,
  SignTxInput,
  Transaction,
  ValidAddressResult,
} from '../types'
import { ChainAdapterDisplayName, ValidAddressResultType } from '../types'
import { toAddressNList, verifyLedgerAppOpen } from '../utils'

export interface ChainAdapterArgs {
  rpcUrl: string
}

export class ChainAdapter implements IChainAdapter<KnownChainIds.AptosMainnet> {
  static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: ASSET_REFERENCE.Aptos,
    accountNumber: 0,
  }

  protected readonly chainId = aptosChainId
  protected readonly assetId = aptosAssetId

  protected client: AptosClient

  constructor(args: ChainAdapterArgs) {
    const config = new AptosConfig({ fullnode: args.rpcUrl })
    this.client = new Aptos(config)
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is AptosWallet {
    if (!supportsAptos(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  getName() {
    return 'Aptos'
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Aptos
  }

  getType(): KnownChainIds.AptosMainnet {
    return KnownChainIds.AptosMainnet
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

      const address = await wallet.aptosGetAddress({
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

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.AptosMainnet>> {
    try {
      const [accountInfo, resources] = await Promise.all([
        this.client.getAccountInfo({ accountAddress: pubkey }),
        this.client.getAccountResources({ accountAddress: pubkey }),
      ])

      const accountBalance = accountInfo?.currentCoinBalance?.amount || '0'

      return {
        balance: accountBalance,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          accountSequence: accountInfo?.sequence_number || '0',
          resources: resources || [],
        },
        pubkey,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAccount',
        options: { pubkey },
      })
    }
  }

  validateAddress(address: string): Promise<ValidAddressResult> {
    try {
      if (!address.startsWith('0x')) {
        return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
      }

      const hexPart = address.slice(2)
      if (hexPart.length !== 64) {
        return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
      }

      if (!/^[0-9a-fA-F]{64}$/.test(hexPart)) {
        return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
      }

      return Promise.resolve({ valid: true, result: ValidAddressResultType.Valid })
    } catch (err) {
      return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
    }
  }

  getAptosClient(): AptosClient {
    return this.client
  }

  getTxHistory(): Promise<never> {
    throw new Error('APTOS transaction history not yet implemented')
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.AptosMainnet>,
  ): Promise<SignTx<KnownChainIds.AptosMainnet>> {
    try {
      const { from, accountNumber, to, value, chainSpecific } = input
      const { gasUnitPrice, maxGasAmount } = chainSpecific || {}

      const transaction = await this.client.transaction.build.simple({
        sender: from,
        data: {
          function: '0x1::coin::transfer',
          typeArguments: ['0x1::aptos_coin::AptosCoin'],
          functionArguments: [to, value],
        } as InputEntryFunctionData,
        options: {
          maxGasAmount: maxGasAmount ? Number(maxGasAmount) : undefined,
          gasUnitPrice: gasUnitPrice ? Number(gasUnitPrice) : undefined,
        },
      })

      const transactionBytes = transaction.bcsToBytes()

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        transactionBytes,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<KnownChainIds.AptosMainnet>): Promise<{
    txToSign: SignTx<KnownChainIds.AptosMainnet>
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

  async signTransaction(
    signTxInput: SignTxInput<SignTx<KnownChainIds.AptosMainnet>>,
  ): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      await verifyLedgerAppOpen(this.chainId, wallet)

      const signedTx = await wallet.aptosSignTx(txToSign)

      if (!signedTx?.signature || !signedTx?.publicKey) {
        throw new Error('error signing tx - missing signature or publicKey')
      }

      const txBytes = txToSign.transactionBytes
      return JSON.stringify({
        signature: signedTx.signature,
        publicKey: signedTx.publicKey,
        transactionBytes: Array.from(txBytes),
      })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signTransaction',
      })
    }
  }

  async signAndBroadcastTransaction({
    signTxInput,
  }: SignAndBroadcastTransactionInput<KnownChainIds.AptosMainnet>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      await verifyLedgerAppOpen(this.chainId, wallet)

      const signedTx = await wallet.aptosSignTx(txToSign)

      if (!signedTx?.signature || !signedTx?.publicKey) {
        throw new Error('error signing tx - missing signature or publicKey')
      }

      const txBytes = txToSign.transactionBytes
      const signatureHex = signedTx.signature
      const publicKeyHex = signedTx.publicKey

      const signatureBytes = Buffer.from(signatureHex, 'hex')
      const publicKeyBytes = Buffer.from(publicKeyHex, 'hex')

      const aptosSignature = Buffer.concat([signatureBytes, publicKeyBytes])

      const transaction = await this.client.transaction.build.simple({
        sender: '', // Will be filled by deserializer
        data: {
          function: '0x1::coin::transfer',
          typeArguments: ['0x1::aptos_coin::AptosCoin'],
          functionArguments: ['', '0'],
        } as InputEntryFunctionData,
      })

      const response = await this.client.transaction.signAndSubmitTransaction({
        signerPublicKey: publicKeyBytes,
        transaction: txBytes,
        signature: aptosSignature,
      })

      return response.hash || ''
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signAndBroadcastTransaction',
      })
    }
  }

  async broadcastTransaction(input: BroadcastTransactionInput): Promise<string> {
    try {
      const { hex } = input
      const parsed = JSON.parse(hex)

      const txBytes = new Uint8Array(parsed.transactionBytes)
      const signatureHex = parsed.signature
      const publicKeyHex = parsed.publicKey

      const signatureBytes = Buffer.from(signatureHex, 'hex')
      const publicKeyBytes = Buffer.from(publicKeyHex, 'hex')

      const aptosSignature = Buffer.concat([signatureBytes, publicKeyBytes])

      const response = await this.client.transaction.submitSignedTransaction({
        signedTransaction: Buffer.concat([txBytes, aptosSignature]),
      })

      return response.hash || ''
    } catch (err) {
      console.error('[APTOS broadcastTransaction] error:', err)
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.AptosMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.AptosMainnet>> {
    try {
      const { to, value, chainSpecific } = input
      const { from } = chainSpecific || {}

      const gasEstimate = await this.client.gasEstimate.estimateTransaction({
        transaction: {
          sender: from || '',
          data: {
            function: '0x1::coin::transfer',
            typeArguments: ['0x1::aptos_coin::AptosCoin'],
            functionArguments: [to, value],
          } as InputEntryFunctionData,
        },
      })

      const gasPrice = gasEstimate.gas_unit_price || '100'
      const gasUsed = gasEstimate.gas_used || '1000'
      const estimatedFee = (BigInt(gasPrice) * BigInt(gasUsed)).toString()

      const txFee = estimatedFee

      return {
        fast: {
          txFee,
          chainSpecific: { maxGasAmount: gasUsed, gasUnitPrice: gasPrice },
        },
        average: {
          txFee,
          chainSpecific: { maxGasAmount: gasUsed, gasUnitPrice: gasPrice },
        },
        slow: {
          txFee,
          chainSpecific: { maxGasAmount: gasUsed, gasUnitPrice: gasPrice },
        },
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getFeeData',
      })
    }
  }

  subscribeTxs(): Promise<void> {
    return Promise.resolve()
  }

  unsubscribeTxs(): void {
    return
  }

  closeTxs(): void {
    return
  }

  async parseTx(txHashOrTx: unknown, pubkey: string): Promise<Transaction> {
    try {
      const tx =
        typeof txHashOrTx === 'string'
          ? await this.client.getTransactionByHash({ transactionHash: txHashOrTx as string })
          : (txHashOrTx as any)

      const txid = tx.hash || ''
      const sender = tx.sender || ''
      const blockHeight = Number(tx.block_height || 0)
      const blockTime = tx.timestamp ? Math.floor(Number(tx.timestamp) / 1000) : 0

      const status = (() => {
        if (tx.success) return TxStatus.Confirmed
        if (tx.vm_status === 'Executed successfully') return TxStatus.Confirmed
        return TxStatus.Failed
      })()

      const transfers = (() => {
        if (!tx.events) return []

        const transferEvents = tx.events.filter(
          (event: any) => event.type === '0x1::coin::CoinDeposit' || event.type === '0x1::coin::WithdrawEvent',
        )

        return transferEvents.map((event: any) => {
          const isReceive = event.type === '0x1::coin::CoinDeposit'
          const eventData = event.data || {}

          return {
            assetId: this.assetId,
            from: isReceive ? [sender] : [pubkey],
            to: isReceive ? [pubkey] : [eventData.to || sender],
            type: isReceive ? TransferType.Receive : TransferType.Send,
            value: eventData.amount || '0',
          }
        })
      })()

      return {
        txid,
        blockHeight,
        blockTime,
        blockHash: undefined,
        chainId: this.chainId,
        confirmations: 0,
        status,
        fee: {
          assetId: this.assetId,
          value: tx.gas_used || '0',
        },
        transfers,
        pubkey,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.parseTx',
      })
    }
  }
}
