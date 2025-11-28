import { SuiClient } from '@mysten/sui/client'
import { Transaction } from '@mysten/sui/transactions'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, suiAssetId, suiChainId } from '@shapeshiftoss/caip'
import type { HDWallet, SuiWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsSui } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'

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
  ValidAddressResult,
} from '../types'
import { ChainAdapterDisplayName, ValidAddressResultType } from '../types'
import { toAddressNList } from '../utils'

export interface ChainAdapterArgs {
  rpcUrl: string
}

export class ChainAdapter implements IChainAdapter<KnownChainIds.SuiMainnet> {
  static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Sui),
    accountNumber: 0,
  }

  protected readonly chainId = suiChainId
  protected readonly assetId = suiAssetId

  protected client: SuiClient

  constructor(args: ChainAdapterArgs) {
    this.client = new SuiClient({ url: args.rpcUrl })
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is SuiWallet {
    if (!supportsSui(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  getName() {
    const enumIndex = Object.values(ChainAdapterDisplayName).indexOf(ChainAdapterDisplayName.Sui)
    return Object.keys(ChainAdapterDisplayName)[enumIndex]
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Sui
  }

  getType(): KnownChainIds.SuiMainnet {
    return KnownChainIds.SuiMainnet
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
      addressIndex: undefined,
    }
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    try {
      const { accountNumber, pubKey, wallet, showOnDevice = false } = input

      if (pubKey) return pubKey

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      const address = await wallet.suiGetAddress({
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

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.SuiMainnet>> {
    try {
      const balance = await this.client.getBalance({ owner: pubkey })

      return {
        balance: balance.totalBalance,
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          tokens: [],
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

  getSuiClient(): SuiClient {
    return this.client
  }

  getTxHistory(): Promise<never> {
    throw new Error('SUI transaction history not yet implemented')
  }

  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.SuiMainnet>,
  ): Promise<SignTx<KnownChainIds.SuiMainnet>> {
    try {
      const { from, accountNumber, to, value, chainSpecific } = input
      const { tokenId, gasBudget, gasPrice } = chainSpecific

      const tx = new Transaction()

      tx.setSender(from)

      if (gasBudget) {
        tx.setGasBudget(Number(gasBudget))
      }

      if (gasPrice) {
        tx.setGasPrice(Number(gasPrice))
      }

      if (tokenId) {
        // Token transfer transaction
        const [coin] = tx.splitCoins(tx.object(tokenId), [value])
        tx.transferObjects([coin], to)
      } else {
        // Native SUI transfer
        const [coin] = tx.splitCoins(tx.gas, [value])
        tx.transferObjects([coin], to)
      }

      const transactionBytes = await tx.build({ client: this.client })

      // Build intent message: intent scope (0) + version (0) + app id (0) + tx bytes
      const intentMessage = new Uint8Array(3 + transactionBytes.length)
      intentMessage[0] = 0 // TransactionData intent scope
      intentMessage[1] = 0 // Version
      intentMessage[2] = 0 // AppId
      intentMessage.set(transactionBytes, 3)

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        intentMessageBytes: intentMessage,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<KnownChainIds.SuiMainnet>): Promise<{
    txToSign: SignTx<KnownChainIds.SuiMainnet>
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
    signTxInput: SignTxInput<SignTx<KnownChainIds.SuiMainnet>>,
  ): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      const signedTx = await wallet.suiSignTx(txToSign)

      if (!signedTx?.signature || !signedTx?.publicKey) {
        throw new Error('error signing tx - missing signature or publicKey')
      }

      // Store signature, publicKey, and transaction bytes for broadcasting
      const txBytes = txToSign.intentMessageBytes.slice(3) // Remove intent prefix
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
  }: SignAndBroadcastTransactionInput<KnownChainIds.SuiMainnet>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      const signedTx = await wallet.suiSignTx(txToSign)

      if (!signedTx?.signature || !signedTx?.publicKey) {
        throw new Error('error signing tx - missing signature or publicKey')
      }

      const txBytes = txToSign.intentMessageBytes.slice(3) // Remove intent prefix

      // Convert hex strings to bytes
      const signatureBytes = Buffer.from(signedTx.signature, 'hex')
      const publicKeyBytes = Buffer.from(signedTx.publicKey, 'hex')

      // SUI signature format: flag || signature || pubkey (all as base64)
      // flag = 0x00 for Ed25519
      const SIGNATURE_SCHEME_FLAG_ED25519 = 0x00
      const formattedSignature = Buffer.concat([
        Buffer.from([SIGNATURE_SCHEME_FLAG_ED25519]),
        signatureBytes,
        publicKeyBytes,
      ])
      const signatureBase64 = formattedSignature.toString('base64')

      const result = await this.client.executeTransactionBlock({
        transactionBlock: Buffer.from(txBytes).toString('base64'),
        signature: signatureBase64,
      })

      return result.digest
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signAndBroadcastTransaction',
      })
    }
  }

  async broadcastTransaction(input: BroadcastTransactionInput): Promise<string> {
    try {
      const { hex } = input
      console.log('[SUI broadcastTransaction] hex:', hex)
      const parsed = JSON.parse(hex)
      console.log('[SUI broadcastTransaction] parsed:', parsed)

      const txBytes = new Uint8Array(parsed.transactionBytes)
      console.log('[SUI broadcastTransaction] txBytes length:', txBytes.length)

      const signatureHex = parsed.signature
      const publicKeyHex = parsed.publicKey
      console.log('[SUI broadcastTransaction] signatureHex:', signatureHex)
      console.log('[SUI broadcastTransaction] publicKeyHex:', publicKeyHex)

      // Convert hex strings to bytes
      const signatureBytes = Buffer.from(signatureHex, 'hex')
      const publicKeyBytes = Buffer.from(publicKeyHex, 'hex')

      // SUI signature format: flag || signature || pubkey (all as base64)
      // flag = 0x00 for Ed25519
      const SIGNATURE_SCHEME_FLAG_ED25519 = 0x00
      const formattedSignature = Buffer.concat([
        Buffer.from([SIGNATURE_SCHEME_FLAG_ED25519]),
        signatureBytes,
        publicKeyBytes,
      ])
      const signatureBase64 = formattedSignature.toString('base64')
      console.log('[SUI broadcastTransaction] formattedSignature base64:', signatureBase64)

      // Convert transaction bytes to base64
      const transactionBlockBase64 = Buffer.from(txBytes).toString('base64')
      console.log('[SUI broadcastTransaction] transactionBlockBase64:', transactionBlockBase64)

      const result = await this.client.executeTransactionBlock({
        transactionBlock: transactionBlockBase64,
        signature: signatureBase64,
        options: {
          showEffects: true,
          showEvents: true,
        },
        requestType: 'WaitForLocalExecution',
      })

      console.log('[SUI broadcastTransaction] result:', result)
      return result.digest
    } catch (err) {
      console.error('[SUI broadcastTransaction] error:', err)
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.SuiMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.SuiMainnet>> {
    try {
      const { to, value, chainSpecific } = input
      const { from, tokenId } = chainSpecific

      const tx = new Transaction()

      tx.setSender(from)

      if (tokenId) {
        const [coin] = tx.splitCoins(tx.object(tokenId), [value])
        tx.transferObjects([coin], to)
      } else {
        const [coin] = tx.splitCoins(tx.gas, [value])
        tx.transferObjects([coin], to)
      }

      const transactionBytes = await tx.build({ client: this.client })

      const dryRunResult = await this.client.dryRunTransactionBlock({
        transactionBlock: transactionBytes,
      })

      const gasPrice = await this.client.getReferenceGasPrice()

      const computationCost = BigInt(dryRunResult.effects.gasUsed.computationCost)
      const storageCost = BigInt(dryRunResult.effects.gasUsed.storageCost)
      const storageRebate = BigInt(dryRunResult.effects.gasUsed.storageRebate)

      const netStorageCost = storageCost > storageRebate ? storageCost - storageRebate : 0n

      const estimatedGas = computationCost + netStorageCost

      const gasBudget = ((estimatedGas * 120n) / 100n).toString()

      const txFee = estimatedGas.toString()

      return {
        fast: {
          txFee,
          chainSpecific: { gasBudget, gasPrice: gasPrice.toString() },
        },
        average: {
          txFee,
          chainSpecific: { gasBudget, gasPrice: gasPrice.toString() },
        },
        slow: {
          txFee,
          chainSpecific: { gasBudget, gasPrice: gasPrice.toString() },
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

  parseTx(): Promise<never> {
    throw new Error('SUI transaction parsing not yet implemented')
  }
}
