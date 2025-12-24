import type { SuiTransactionBlockResponse } from '@mysten/sui/client'
import { SuiClient } from '@mysten/sui/client'
import { Transaction as SuiTransaction } from '@mysten/sui/transactions'
import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import {
  ASSET_NAMESPACE,
  ASSET_REFERENCE,
  suiAssetId,
  suiChainId,
  toAssetId,
} from '@shapeshiftoss/caip'
import type { HDWallet, SuiWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsSui } from '@shapeshiftoss/hdwallet-core'
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
    return 'Sui'
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
      const [nativeBalance, allBalances] = await Promise.all([
        this.client.getBalance({ owner: pubkey }),
        this.client.getAllBalances({ owner: pubkey }),
      ])

      const nonZeroBalances = allBalances.filter(balance => {
        const isSuiNative = balance.coinType === '0x2::sui::SUI'
        return !isSuiNative && balance.totalBalance !== '0'
      })

      const tokens = await Promise.all(
        nonZeroBalances.map(async balance => {
          const symbol = balance.coinType.split('::').pop() ?? 'UNKNOWN'

          // Normalize coinType to ensure proper format with leading zeros
          // SUI addresses should be 66 chars (0x + 64 hex chars)
          const normalizeCoinType = (coinType: string): string => {
            const parts = coinType.split('::')
            if (parts.length < 2) return coinType

            const address = parts[0]
            if (!address.startsWith('0x')) return coinType

            // Pad address to 66 characters (0x + 64 hex digits)
            const hexPart = address.slice(2)
            const paddedHex = hexPart.padStart(64, '0')
            parts[0] = `0x${paddedHex}`

            return parts.join('::')
          }

          const normalizedCoinType = normalizeCoinType(balance.coinType)

          const assetId = toAssetId({
            chainId: this.chainId,
            assetNamespace: ASSET_NAMESPACE.suiCoin,
            assetReference: normalizedCoinType,
          })

          try {
            const metadata = await this.client.getCoinMetadata({ coinType: balance.coinType })

            if (!metadata) {
              return {
                assetId,
                balance: balance.totalBalance,
                symbol,
                name: balance.coinType,
                precision: 0,
              }
            }

            return {
              assetId,
              balance: balance.totalBalance,
              symbol: metadata.symbol ?? symbol,
              name: metadata.name ?? balance.coinType,
              precision: metadata.decimals ?? 0,
            }
          } catch (err) {
            return {
              assetId,
              balance: balance.totalBalance,
              symbol,
              name: balance.coinType,
              precision: 0,
            }
          }
        }),
      )

      return {
        balance: nativeBalance.totalBalance,
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

      const tx = new SuiTransaction()

      tx.setSender(from)

      if (gasBudget) {
        tx.setGasBudget(Number(gasBudget))
      }

      if (gasPrice) {
        tx.setGasPrice(Number(gasPrice))
      }

      if (tokenId) {
        // Token transfer transaction - tokenId is the coin type (e.g., 0x...::module::Type)
        // We need to get coin objects of this type owned by the sender
        const coins = await this.client.getCoins({
          owner: from,
          coinType: tokenId,
        })

        if (!coins.data || coins.data.length === 0) {
          throw new Error(`No coins found for type ${tokenId}`)
        }

        const [coinToSend] = tx.splitCoins(tx.object(coins.data[0].coinObjectId), [value])
        tx.transferObjects([coinToSend], to)
      } else {
        // Native SUI transfer
        const [coin] = tx.splitCoins(tx.gas, [value])
        tx.transferObjects([coin], to)
      }

      const transactionJson = await tx.toJSON()

      const transactionBytes = await tx.build({ client: this.client })

      const intentMessage = new Uint8Array(3 + transactionBytes.length)
      intentMessage[0] = 0 // TransactionData intent scope
      intentMessage[1] = 0 // Version
      intentMessage[2] = 0 // AppId
      intentMessage.set(transactionBytes, 3)

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        intentMessageBytes: intentMessage,
        transactionJson,
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

      await verifyLedgerAppOpen(this.chainId, wallet)

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

      await verifyLedgerAppOpen(this.chainId, wallet)

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
      const parsed = JSON.parse(hex)

      const txBytes = new Uint8Array(parsed.transactionBytes)

      const signatureHex = parsed.signature
      const publicKeyHex = parsed.publicKey

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

      // Convert transaction bytes to base64
      const transactionBlockBase64 = Buffer.from(txBytes).toString('base64')

      const result = await this.client.executeTransactionBlock({
        transactionBlock: transactionBlockBase64,
        signature: signatureBase64,
        options: {
          showEffects: true,
          showEvents: true,
        },
        requestType: 'WaitForLocalExecution',
      })

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

      const gasPrice = await this.client.getReferenceGasPrice()

      const tx = new SuiTransaction()

      tx.setSender(from)

      if (tokenId && tokenId !== '0x2::sui::SUI') {
        // Token transfer - get coin objects for this token type
        const coins = await this.client.getCoins({
          owner: from,
          coinType: tokenId,
        })

        if (!coins.data || coins.data.length === 0) {
          throw new Error(`No coins found for type ${tokenId}`)
        }

        const [coin] = tx.splitCoins(tx.object(coins.data[0].coinObjectId), [value])
        tx.transferObjects([coin], to)
      } else {
        const [coin] = tx.splitCoins(tx.gas, [value])
        tx.transferObjects([coin], to)
      }

      const transactionBytes = await tx.build({ client: this.client })

      const dryRunResult = await this.client.dryRunTransactionBlock({
        transactionBlock: transactionBytes,
      })

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

  private parseProgrammableTransactionBlock(tx: SuiTransactionBlockResponse): {
    transferAmount: string | undefined
    recipient: string | undefined
    coinType: string | undefined
  } {
    const ptb = tx.transaction?.data.transaction
    if (ptb?.kind !== 'ProgrammableTransaction') {
      return { transferAmount: undefined, recipient: undefined, coinType: undefined }
    }

    const inputs = ptb.inputs ?? []
    const commands = ptb.transactions ?? []

    let transferAmount: string | undefined
    let recipient: string | undefined
    let coinObjectId: string | undefined

    for (const command of commands) {
      if ('SplitCoins' in command) {
        const [coinSource, amounts] = command.SplitCoins
        const firstAmount = amounts?.[0]
        if (!firstAmount || !('Input' in firstAmount)) continue

        const amountInput = inputs[firstAmount.Input]
        if (amountInput?.type === 'pure' && amountInput.valueType === 'u64') {
          transferAmount = amountInput.value
        }

        // For token transfers, coin source is an object input
        if (typeof coinSource === 'object' && 'Input' in coinSource) {
          const coinInput = inputs[coinSource.Input]
          if (coinInput?.type === 'object') {
            coinObjectId = coinInput.objectId
          }
        }
      }

      if ('TransferObjects' in command) {
        const [_objects, recipientArg] = command.TransferObjects
        if (!recipientArg || !('Input' in recipientArg)) continue

        const recipientInput = inputs[recipientArg.Input]
        if (recipientInput?.type === 'pure' && recipientInput.valueType === 'address') {
          recipient = recipientInput.value
        }
      }
    }

    // Extract coin type from objectChanges if we have a coin object ID
    const coinType = (() => {
      if (!coinObjectId) return undefined

      const objectChange = tx.objectChanges?.find(
        change => 'objectId' in change && change.objectId === coinObjectId,
      )

      if (!objectChange || !('objectType' in objectChange)) return undefined

      const match = objectChange.objectType.match(/0x2::coin::Coin<(.+)>/)
      return match?.[1]
    })()

    console.log(
      `[SuiChainAdapter.parseTx] PTB parsing:`,
      JSON.stringify({ transferAmount, recipient, coinObjectId, coinType }),
    )

    return { transferAmount, recipient, coinType }
  }

  async parseTx(txHashOrTx: unknown, pubkey: string): Promise<Transaction> {
    try {
      const tx =
        typeof txHashOrTx === 'string'
          ? await this.client.getTransactionBlock({
              digest: txHashOrTx,
              options: {
                showInput: true,
                showEffects: true,
                showBalanceChanges: true,
                showObjectChanges: true,
              },
            })
          : (txHashOrTx as SuiTransactionBlockResponse)

      const sender = tx.transaction?.data.sender ?? ''

      console.log(`[SuiChainAdapter.parseTx] FULL NODE RESPONSE:`, JSON.stringify(tx, null, 2))

      const txid = tx.digest
      const blockHeight = Number(tx.checkpoint ?? 0)
      const blockTime = tx.timestampMs ? Math.floor(Number(tx.timestampMs) / 1000) : 0

      const latestCheckpoint = await this.client.getLatestCheckpointSequenceNumber()
      const confirmations = tx.checkpoint ? Number(latestCheckpoint) - Number(tx.checkpoint) + 1 : 0

      const status = (() => {
        const txStatus = tx.effects?.status.status
        if (txStatus === 'success') return TxStatus.Confirmed
        if (txStatus === 'failure') return TxStatus.Failed
        return TxStatus.Unknown
      })()

      const gasUsed = tx.effects?.gasUsed
      const fee = !gasUsed
        ? undefined
        : {
            assetId: this.assetId,
            value: (
              BigInt(gasUsed.computationCost) +
              BigInt(gasUsed.storageCost) -
              BigInt(gasUsed.storageRebate)
            ).toString(),
          }

      const {
        transferAmount: ptbTransferAmount,
        recipient: ptbRecipient,
        coinType: ptbCoinType,
      } = this.parseProgrammableTransactionBlock(tx)

      const balanceChanges = tx.balanceChanges ?? []

      console.log(
        `[SuiChainAdapter.parseTx] Balance changes:`,
        JSON.stringify({
          txid,
          balanceChangesCount: balanceChanges.length,
          balanceChanges,
        }),
      )

      // Filter out balance changes that only represent gas fees
      const actualTransferChanges = balanceChanges.filter(change => {
        if (!fee || change.coinType !== '0x2::sui::SUI') return true

        const changeAmount = BigInt(change.amount)
        const absoluteChange = changeAmount < 0n ? -changeAmount : changeAmount
        const feeAmount = BigInt(fee.value)

        return absoluteChange !== feeAmount
      })

      const transfersFromBalanceChanges = actualTransferChanges.map(change => {
        const ownerAddress = (() => {
          if (typeof change.owner === 'object' && 'AddressOwner' in change.owner) {
            return change.owner.AddressOwner
          }
          return null
        })()

        const assetId =
          change.coinType === '0x2::sui::SUI'
            ? this.assetId
            : toAssetId({
                chainId: this.chainId,
                assetNamespace: ASSET_NAMESPACE.suiCoin,
                assetReference: change.coinType,
              })

        const amount = BigInt(change.amount)
        const isReceive = amount > 0n
        const isSend = amount < 0n

        const transferType = (() => {
          if (ownerAddress !== pubkey) return TransferType.Contract
          return isReceive ? TransferType.Receive : TransferType.Send
        })()

        // For Send transfers of native SUI, use PTB amount to exclude gas
        const shouldUsePtbAmount =
          isSend && ptbTransferAmount && change.coinType === '0x2::sui::SUI'
        const transferValue = shouldUsePtbAmount
          ? ptbTransferAmount
          : (amount < 0n ? -amount : amount).toString()

        const from = isSend ? [sender] : ownerAddress ? [ownerAddress] : [sender]
        const to = isReceive ? [ownerAddress ?? sender] : [sender]

        return { assetId, from, to, type: transferType, value: transferValue }
      })

      // For self-sends where balance changes were filtered out, use PTB data
      const transfersFromPtb = (() => {
        if (actualTransferChanges.length > 0) return []
        if (!ptbTransferAmount || !ptbRecipient) return []

        const isSelfSend = sender === ptbRecipient
        const isSender = sender === pubkey
        const isRecipient = ptbRecipient === pubkey

        // Determine the correct assetId (native SUI or token)
        const assetId = !ptbCoinType
          ? this.assetId
          : toAssetId({
              chainId: this.chainId,
              assetNamespace: ASSET_NAMESPACE.suiCoin,
              assetReference: ptbCoinType,
            })

        console.log(
          `[SuiChainAdapter.parseTx] Creating PTB transfers:`,
          JSON.stringify({ ptbCoinType, assetId, isSelfSend, isSender, isRecipient }),
        )

        if (isSelfSend && isSender) {
          return [
            {
              assetId,
              from: [sender],
              to: [ptbRecipient],
              type: TransferType.Send,
              value: ptbTransferAmount,
            },
            {
              assetId,
              from: [sender],
              to: [ptbRecipient],
              type: TransferType.Receive,
              value: ptbTransferAmount,
            },
          ]
        }

        if (isSender) {
          return [
            {
              assetId,
              from: [sender],
              to: [ptbRecipient],
              type: TransferType.Send,
              value: ptbTransferAmount,
            },
          ]
        }

        if (isRecipient) {
          return [
            {
              assetId,
              from: [sender],
              to: [ptbRecipient],
              type: TransferType.Receive,
              value: ptbTransferAmount,
            },
          ]
        }

        return []
      })()

      const transfers = [...transfersFromBalanceChanges, ...transfersFromPtb]

      console.log(
        `[SuiChainAdapter.parseTx] FINAL:`,
        JSON.stringify({
          txid,
          feeValue: fee?.value,
          transfersFromBalanceChanges: transfersFromBalanceChanges.length,
          transfersFromPtb: transfersFromPtb.length,
          totalTransfers: transfers.length,
          transfers: transfers.map(t => ({
            type: t.type,
            assetId: t.assetId,
            value: t.value,
          })),
        }),
      )

      return {
        txid,
        blockHeight,
        blockTime,
        blockHash: undefined,
        chainId: this.chainId,
        confirmations,
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
