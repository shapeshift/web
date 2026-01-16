import type { AptosCoinType } from '@aptos-labs/ts-sdk'
import { AptosClient, AptosConfig, TypeTagParser } from '@aptos-labs/ts-sdk'
import { createBLAKE2b } from 'hash-wasm'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  aptosAssetId,
  aptosChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { AptosWallet, HDWallet } from '@shapeshiftoss/hdwallet-core'
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
    coinType: Number(ASSET_REFERENCE.Aptos),
    accountNumber: 0,
  }

  protected readonly chainId = aptosChainId
  protected readonly assetId = aptosAssetId

  protected client: AptosClient

  constructor(args: ChainAdapterArgs) {
    const config = new AptosConfig({ fullnode: args.rpcUrl })
    this.client = new AptosClient(config)
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
      const [resources, coinResources] = await Promise.all([
        this.client.getAccountResources({ accountAddress: pubkey }),
        this.client.getAccountCoinResources({ accountAddress: pubkey }),
      ])

      const aptosCoinType = '0x1::aptos_coin::AptosCoin'

      const aptosCoin = resources.find((r) => r.type === aptosCoinType)
      const aptosBalance = aptosCoin?.data?.coin?.value || '0'

      const tokenResources = resources.filter((r) => r.type !== aptosCoinType && r.type.includes('Coin'))

      const tokens = await Promise.all(
        tokenResources.map(async (resource) => {
          const typeTag = new TypeTagParser(resource.type).parseTypeTag()
          const coinType = resource.type

          const assetId = toAssetId({
            chainId: this.chainId,
            assetNamespace: ASSET_NAMESPACE.aptosToken,
            assetReference: coinType,
          })

          try {
            const coinStore = coinResources.find((c) => c.type === coinType)
            const balance = coinStore?.data?.coin?.value || '0'

            return {
              assetId,
              balance,
              symbol: typeTag.symbol || 'UNKNOWN',
              name: typeTag.module || 'Unknown',
              precision: 8,
            }
          } catch (err) {
            return {
              assetId,
              balance: '0',
              symbol: 'UNKNOWN',
              name: resource.type,
              precision: 8,
            }
          }
        }),
      )

      return {
        balance: aptosBalance,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          tokens,
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
      const { tokenId } = chainSpecific

      const aptosCoinType = '0x1::aptos_coin::AptosCoin'

      if (tokenId && tokenId !== aptosCoinType) {
        throw new Error('APTOS token transfers not yet implemented')
      }

      const builder = this.client.transactionBuilder.build({
        sender: from,
        data: {
          function: '0x1::coin::transfer',
          typeArguments: [aptosCoinType],
          functionArguments: [to, value],
        },
      })

      const transactionBytes = await builder.bcsToBytes()

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

      const signedTx = await wallet.aptosSignTx({
        addressNList: txToSign.addressNList,
        transactionBytes: txToSign.transactionBytes,
      })

      if (!signedTx?.signature || !signedTx?.publicKey) {
        throw new Error('error signing tx - missing signature or publicKey')
      }

      return JSON.stringify({
        signature: signedTx.signature,
        publicKey: signedTx.publicKey,
        transactionBytes: Array.from(txToSign.transactionBytes),
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

      const signedTx = await wallet.aptosSignTx({
        addressNList: txToSign.addressNList,
        transactionBytes: txToSign.transactionBytes,
      })

      if (!signedTx?.signature || !signedTx?.publicKey) {
        throw new Error('error signing tx - missing signature or publicKey')
      }

      const result = await this.client.submitSignedBCSTransaction({
        signedTx: {
          signature: signedTx.signature,
          transactionBytes: Array.from(txToSign.transactionBytes),
        },
      })

      return result.hash
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

      const signatureBytes = Buffer.from(signatureHex, 'hex')

      const result = await this.client.submitSignedBCSTransaction({
        signedTx: {
          signature: signatureHex,
          transactionBytes: Array.from(txBytes),
        },
      })

      return result.hash
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
      const { from, tokenId } = chainSpecific

      const aptosCoinType = '0x1::aptos_coin::AptosCoin'

      if (tokenId && tokenId !== aptosCoinType) {
        throw new Error('APTOS token fee estimation not yet implemented')
      }

      const gasUnitPrice = await this.client.getGasEstimationUnitPrice()

      const estimatedGas = BigInt(10000)

      const txFee = (gasUnitPrice.gas_estimate * Number(estimatedGas)).toString()

      return {
        fast: {
          txFee,
          chainSpecific: { maxGasAmount: estimatedGas.toString(), gasUnitPrice: gasUnitPrice.gas_estimate.toString() },
        },
        average: {
          txFee,
          chainSpecific: { maxGasAmount: estimatedGas.toString(), gasUnitPrice: gasUnitPrice.gas_estimate.toString() },
        },
        slow: {
          txFee,
          chainSpecific: { maxGasAmount: estimatedGas.toString(), gasUnitPrice: gasUnitPrice.gas_estimate.toString() },
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

      const sender = tx.sender || ''
      const txid = tx.hash || ''
      const blockHeight = Number(tx.block_height || 0)
      const blockTime = Math.floor((Number(tx.timestamp || 0) / 1000))

      const status = (() => {
        if (tx.success === true) return TxStatus.Confirmed
        if (tx.success === false) return TxStatus.Failed
        return TxStatus.Unknown
      })()

      const fee = tx.gas_used
        ? {
            assetId: this.assetId,
            value: (BigInt(tx.gas_used) * BigInt(tx.gas_unit_price || 100)).toString(),
          }
        : undefined

      const transfers = (() => {
        const transfersList: any[] = []

        if (tx.payload?.function === '0x1::coin::transfer') {
          const args = tx.payload?.arguments || []
          if (args.length >= 2) {
            const recipient = args[0] || ''
            const amount = args[1] || '0'

            const isSender = sender === pubkey
            const isRecipient = recipient === pubkey

            if (isSender || isRecipient) {
              transfersList.push({
                assetId: this.assetId,
                from: [sender],
                to: [recipient],
                type: isSender ? TransferType.Send : TransferType.Receive,
                value: amount,
              })
            }
          }
        }

        return transfersList
      })()

      return {
        txid,
        blockHeight,
        blockTime,
        blockHash: undefined,
        chainId: this.chainId,
        confirmations: 0,
        status,
        fee,
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
