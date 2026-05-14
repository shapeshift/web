import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  ASSET_REFERENCE,
  aptosAssetId,
  aptosChainId,
} from '@shapeshiftoss/caip'
import type { AptosSignTx, AptosWallet, HDWallet } from '@shapeshiftoss/hdwallet-core'
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
  protected readonly rpcUrl: string

  constructor(args: ChainAdapterArgs) {
    this.rpcUrl = args.rpcUrl
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
      const response = await fetch(`${this.rpcUrl}/accounts/${pubkey}`)

      if (!response.ok) {
        throw new Error(`Aptos account request failed: ${response.status}`)
      }

      const accountData = await response.json()

      // Aptos returns coin balances as an array of { coin: { type: string }, coin?: { value: string } }
      // The native APT balance is under 0x1::aptos_coin::AptosCoin
      let balance = '0'

      if (Array.isArray(accountData)) {
        // Some endpoints return array of coin resources
        for (const resource of accountData) {
          if (resource.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>') {
            balance = resource.data?.coin?.value ?? '0'
            break
          }
        }
      }

      return {
        balance,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {},
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
    } catch {
      return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
    }
  }

  getTxHistory(): Promise<never> {
    throw new Error('Aptos transaction history not yet implemented')
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.AptosMainnet>,
  ): Promise<SignTx<KnownChainIds.AptosMainnet>> {
    try {
      const { from, accountNumber, to, value } = input

      // Build a raw Aptos transaction for signing
      // We construct the BCS-encoded transaction payload for 0x1::coin::transfer
      const sequenceNumber = await this.getSequenceNumber(from)
      const gasEstimate = await this.getGasPrice()
      const chainId = 1 // Aptos mainnet chain ID

      // Build the raw transaction structure
      const txData = {
        sender: from,
        sequence_number: sequenceNumber,
        max_gas_amount: '2000',
        gas_unit_price: gasEstimate,
        expiration_timestamp_secs: String(Math.floor(Date.now() / 1000) + 3600),
        chain_id: chainId,
        payload: {
          type: 'entry_function_payload',
          function: '0x1::coin::transfer',
          type_arguments: ['0x1::aptos_coin::AptosCoin'],
          arguments: [to, value],
        },
      }

      // Serialize the transaction for the hardware wallet to sign
      // The wallet expects raw BCS bytes via aptosSignTx
      const txBytes = new TextEncoder().encode(JSON.stringify(txData))

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        txBytes,
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
        txBytes: txToSign.txBytes,
      })

      if (!signedTx?.signature || !signedTx?.publicKey) {
        throw new Error('error signing tx - missing signature or publicKey')
      }

      return JSON.stringify({
        signature: signedTx.signature,
        publicKey: signedTx.publicKey,
        txBytes: Array.from(signedTx.txBytes),
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
      const signedTxHex = await this.signTransaction(signTxInput)
      return this.broadcastTransaction({ hex: signedTxHex })
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

      // Submit the signed transaction to the Aptos REST API
      // The signed transaction needs to be submitted as a BCS-encoded body
      const response = await fetch(`${this.rpcUrl}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: `0x${parsed.publicKey}`,
          signature: {
            type: 'ed25519_signature',
            public_key: `0x${parsed.publicKey}`,
            signature: `0x${parsed.signature}`,
          },
          payload: JSON.parse(new TextDecoder().decode(new Uint8Array(parsed.txBytes))).payload,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Aptos broadcast failed: ${response.status} - ${errorBody}`)
      }

      const result = await response.json()
      return result.hash ?? result.version?.toString() ?? ''
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.AptosMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.AptosMainnet>> {
    try {
      const gasPrice = await this.getGasPrice()
      const maxGasAmount = '2000'
      const txFee = (BigInt(maxGasAmount) * BigInt(gasPrice)).toString()

      const feeData = {
        gasEstimate: txFee,
        gasUnitPrice: gasPrice,
        maxGasAmount,
      }

      return {
        fast: { txFee, chainSpecific: feeData },
        average: { txFee, chainSpecific: feeData },
        slow: { txFee, chainSpecific: feeData },
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
      const txHash = typeof txHashOrTx === 'string' ? txHashOrTx : ''

      const response = await fetch(`${this.rpcUrl}/transactions/by_hash/${txHash}`)
      if (!response.ok) {
        throw new Error(`Aptos tx lookup failed: ${response.status}`)
      }

      const tx = await response.json()

      const txid = tx.hash ?? txHash
      const blockHeight = Number(tx.version ?? 0)
      const blockTime = tx.timestamp ? Math.floor(Number(tx.timestamp) / 1000) : 0

      const success = tx.success !== false
      const status = success ? TxStatus.Confirmed : TxStatus.Failed

      const gasUsed = tx.gas_used ?? '0'
      const gasUnitPrice = tx.gas_unit_price ?? '0'
      const fee = {
        assetId: this.assetId,
        value: (BigInt(gasUsed) * BigInt(gasUnitPrice)).toString(),
      }

      const transfers: Transaction['transfers'] = []

      // Parse events for transfers
      const events = tx.events ?? []
      for (const event of events) {
        if (event.type === '0x1::coin::WithdrawEvent' || event.type === '0x1::coin::DepositEvent') {
          // These are coin module events, skip in favor of ChangeEvent
          continue
        }

        if (event.type?.includes('::CoinTransfer') || event.type?.includes('::Withdraw') || event.type?.includes('::Deposit')) {
          const amount = event.data?.amount ?? event.data?.value ?? '0'
          const isFromSender = event.guid?.account_address === pubkey || event.data?.from === pubkey
          const isToSender = event.data?.to === pubkey

          if (isFromSender) {
            transfers.push({
              assetId: this.assetId,
              from: [event.data?.from ?? event.guid?.account_address ?? pubkey],
              to: [event.data?.to ?? ''],
              type: TransferType.Send,
              value: amount,
            })
          }
          if (isToSender) {
            transfers.push({
              assetId: this.assetId,
              from: [event.data?.from ?? ''],
              to: [event.data?.to ?? pubkey],
              type: TransferType.Receive,
              value: amount,
            })
          }
        }
      }

      // If no transfers found from events, try to parse from the payload
      if (transfers.length === 0 && tx.payload?.function === '0x1::coin::transfer') {
        const args = tx.payload.arguments ?? []
        const recipient = args[0] ?? ''
        const amount = args[1] ?? '0'
        const sender = tx.sender ?? pubkey

        const isSend = sender === pubkey
        const isReceive = recipient === pubkey

        if (isSend) {
          transfers.push({
            assetId: this.assetId,
            from: [sender],
            to: [recipient],
            type: TransferType.Send,
            value: String(amount),
          })
        }
        if (isReceive) {
          transfers.push({
            assetId: this.assetId,
            from: [sender],
            to: [recipient],
            type: TransferType.Receive,
            value: String(amount),
          })
        }
      }

      return {
        txid,
        blockHeight,
        blockTime,
        blockHash: undefined,
        chainId: this.chainId,
        confirmations: status === TxStatus.Confirmed ? 1 : 0,
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

  private async getSequenceNumber(address: string): Promise<string> {
    try {
      const response = await fetch(`${this.rpcUrl}/accounts/${address}`)
      if (!response.ok) return '0'
      const data = await response.json()
      return data.sequence_number ?? '0'
    } catch {
      return '0'
    }
  }

  private async getGasPrice(): Promise<string> {
    try {
      const response = await fetch(`${this.rpcUrl}/transactions/estimate_gas_price`)
      if (!response.ok) return '100'
      const data = await response.json()
      return data.gas_estimate?.toString() ?? '100'
    } catch {
      return '100'
    }
  }
}
