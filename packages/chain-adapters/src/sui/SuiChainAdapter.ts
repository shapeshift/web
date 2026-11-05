import { bcs } from '@mysten/sui/bcs'
import type { SuiClientTypes } from '@mysten/sui/client'
import { SuiGrpcClient } from '@mysten/sui/grpc'
import type { SerializedTransactionDataV2 } from '@mysten/sui/transactions'
import { Transaction as SuiTransaction } from '@mysten/sui/transactions'
import { SUI_TYPE_ARG } from '@mysten/sui/utils'
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

type SuiTransactionResponse = SuiClientTypes.Transaction<{
  balanceChanges: true
  effects: true
  objectTypes: true
  transaction: true
}>

type SuiTransactionArgument = Extract<
  SerializedTransactionDataV2['commands'][number],
  { SplitCoins: unknown }
>['SplitCoins']['coin']

export class ChainAdapter implements IChainAdapter<KnownChainIds.SuiMainnet> {
  static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Sui),
    accountNumber: 0,
  }

  protected readonly chainId = suiChainId
  protected readonly assetId = suiAssetId

  protected client: SuiGrpcClient

  constructor(args: ChainAdapterArgs) {
    this.client = new SuiGrpcClient({ network: 'mainnet', baseUrl: args.rpcUrl })
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
        this.listAllBalances(pubkey),
      ])

      const nonZeroBalances = allBalances.filter(
        balance => !this.isSuiCoinType(balance.coinType) && balance.balance !== '0',
      )

      const tokens = await Promise.all(
        nonZeroBalances.map(async balance => {
          const symbol = balance.coinType.split('::').pop() ?? 'UNKNOWN'
          const normalizedCoinType = this.normalizeCoinType(balance.coinType)

          const assetId = toAssetId({
            chainId: this.chainId,
            assetNamespace: ASSET_NAMESPACE.suiCoin,
            assetReference: normalizedCoinType,
          })

          try {
            const { coinMetadata: metadata } = await this.client.getCoinMetadata({
              coinType: balance.coinType,
            })

            if (!metadata) {
              return {
                assetId,
                balance: balance.balance,
                symbol,
                name: balance.coinType,
                precision: 0,
              }
            }

            return {
              assetId,
              balance: balance.balance,
              symbol: metadata.symbol ?? symbol,
              name: metadata.name ?? balance.coinType,
              precision: metadata.decimals ?? 0,
            }
          } catch (err) {
            return {
              assetId,
              balance: balance.balance,
              symbol,
              name: balance.coinType,
              precision: 0,
            }
          }
        }),
      )

      return {
        balance: nativeBalance.balance.balance,
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

  getSuiClient(): SuiGrpcClient {
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
        const coins = await this.client.listCoins({
          owner: from,
          coinType: tokenId,
        })

        if (coins.objects.length === 0) {
          throw new Error(`No coins found for type ${tokenId}`)
        }

        const [coinToSend] = tx.splitCoins(tx.object(coins.objects[0].objectId), [value])
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

      const result = await this.client.executeTransaction({
        transaction: txBytes,
        signatures: [signatureBase64],
      })

      return (result.Transaction ?? result.FailedTransaction).digest
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

      const result = await this.client.executeTransaction({
        transaction: txBytes,
        signatures: [signatureBase64],
      })

      return (result.Transaction ?? result.FailedTransaction).digest
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

      const { referenceGasPrice: gasPrice } = await this.client.getReferenceGasPrice()

      const tx = new SuiTransaction()

      tx.setSender(from)

      if (tokenId && tokenId !== '0x2::sui::SUI') {
        // Token transfer - get coin objects for this token type
        const coins = await this.client.listCoins({
          owner: from,
          coinType: tokenId,
        })

        if (coins.objects.length === 0) {
          throw new Error(`No coins found for type ${tokenId}`)
        }

        const [coin] = tx.splitCoins(tx.object(coins.objects[0].objectId), [value])
        tx.transferObjects([coin], to)
      } else {
        const [coin] = tx.splitCoins(tx.gas, [value])
        tx.transferObjects([coin], to)
      }

      const transactionBytes = await tx.build({ client: this.client })

      const dryRunResult = await this.client.simulateTransaction({
        transaction: transactionBytes,
        include: { effects: true },
      })

      const { gasUsed } = (dryRunResult.Transaction ?? dryRunResult.FailedTransaction).effects

      const computationCost = BigInt(gasUsed.computationCost)
      const storageCost = BigInt(gasUsed.storageCost)
      const storageRebate = BigInt(gasUsed.storageRebate)

      const netStorageCost = storageCost > storageRebate ? storageCost - storageRebate : 0n

      const estimatedGas = computationCost + netStorageCost

      const gasBudget = ((estimatedGas * 120n) / 100n).toString()

      const txFee = estimatedGas.toString()

      return {
        fast: {
          txFee,
          chainSpecific: { gasBudget, gasPrice },
        },
        average: {
          txFee,
          chainSpecific: { gasBudget, gasPrice },
        },
        slow: {
          txFee,
          chainSpecific: { gasBudget, gasPrice },
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

  // Normalize SUI coin type to ensure consistent AssetId generation
  // SUI addresses should be 66 characters (0x + 64 hex chars) with leading zeros
  // Example: 0x2::sui::SUI stays the same, but 0xdba3::usdc::USDC becomes 0x0000...0dba3::usdc::USDC
  private normalizeCoinType(coinType: string): string {
    const parts = coinType.split('::')
    if (parts.length < 2) return coinType

    const address = parts[0]
    if (!address.startsWith('0x')) return coinType

    const hexPart = address.slice(2)
    const paddedHex = hexPart.padStart(64, '0')
    parts[0] = `0x${paddedHex}`

    return parts.join('::')
  }

  private isSuiCoinType(coinType: string): boolean {
    return this.normalizeCoinType(coinType) === this.normalizeCoinType(SUI_TYPE_ARG)
  }

  private async listAllBalances(
    owner: string,
    cursor: string | null = null,
  ): Promise<SuiClientTypes.Balance[]> {
    const response = await this.client.listBalances({ owner, cursor })

    if (!response.hasNextPage) return response.balances

    return [...response.balances, ...(await this.listAllBalances(owner, response.cursor))]
  }

  private getPureInputBytes(
    tx: SuiTransactionResponse,
    arg: SuiTransactionArgument | undefined,
  ): string | undefined {
    if (!arg || !('Input' in arg)) return
    const input = tx.transaction.inputs[arg.Input]
    if (input && 'Pure' in input) return input.Pure.bytes
  }

  private parseProgrammableTransactionBlock(tx: SuiTransactionResponse): {
    transferAmount: string | undefined
    recipient: string | undefined
    coinType: string | undefined
  } {
    const { inputs, commands } = tx.transaction

    const splitCoins = commands
      .map(command => ('SplitCoins' in command ? command.SplitCoins : undefined))
      .find(Boolean)
    const transferObjects = commands
      .map(command => ('TransferObjects' in command ? command.TransferObjects : undefined))
      .find(Boolean)

    const transferAmountBytes = this.getPureInputBytes(tx, splitCoins?.amounts[0])
    const transferAmount = transferAmountBytes ? bcs.U64.fromBase64(transferAmountBytes) : undefined

    const recipientBytes = this.getPureInputBytes(tx, transferObjects?.address)
    const recipient = recipientBytes ? bcs.Address.fromBase64(recipientBytes) : undefined

    // For token transfers, the split coin source is an owned object input
    const coinObjectId = (() => {
      const coinSource = splitCoins?.coin
      if (!coinSource || !('Input' in coinSource)) return
      const coinInput = inputs[coinSource.Input]
      if (!coinInput || !('Object' in coinInput)) return
      if ('ImmOrOwnedObject' in coinInput.Object) return coinInput.Object.ImmOrOwnedObject.objectId
    })()

    const coinType = (() => {
      if (!coinObjectId) return
      const extractedCoinType =
        tx.objectTypes[coinObjectId]?.match(/^0x0*2::coin::Coin<(.+)>$/)?.[1]
      return extractedCoinType ? this.normalizeCoinType(extractedCoinType) : undefined
    })()

    return { transferAmount, recipient, coinType }
  }

  async parseTx(txHashOrTx: unknown, pubkey: string): Promise<Transaction> {
    try {
      const tx = await (async () => {
        if (typeof txHashOrTx !== 'string') return txHashOrTx as SuiTransactionResponse

        const result = await this.client.getTransaction({
          digest: txHashOrTx,
          include: { balanceChanges: true, effects: true, objectTypes: true, transaction: true },
        })

        return result.Transaction ?? result.FailedTransaction
      })()

      const sender = tx.transaction.sender ?? ''
      const txid = tx.digest
      const blockHeight = Number(tx.checkpoint ?? 0)
      const blockTime = tx.timestampMs ? Math.floor(tx.timestampMs / 1000) : 0

      const { response: serviceInfo } = await this.client.ledgerService.getServiceInfo({})
      const latestCheckpoint = serviceInfo.checkpointHeight ?? 0n
      const confirmations = tx.checkpoint
        ? Number(latestCheckpoint - BigInt(tx.checkpoint) + 1n)
        : 0

      const status = tx.status.success ? TxStatus.Confirmed : TxStatus.Failed

      const { gasUsed } = tx.effects
      const fee = {
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

      // Filter out balance changes that only represent gas fees
      const actualTransferChanges = tx.balanceChanges.filter(change => {
        if (!this.isSuiCoinType(change.coinType)) return true

        const changeAmount = BigInt(change.amount)
        const absoluteChange = changeAmount < 0n ? -changeAmount : changeAmount
        const feeAmount = BigInt(fee.value)

        return absoluteChange !== feeAmount
      })

      const transfersFromBalanceChanges = actualTransferChanges.map(change => {
        const ownerAddress = change.address
        const isSuiCoin = this.isSuiCoinType(change.coinType)

        const assetId = isSuiCoin
          ? this.assetId
          : toAssetId({
              chainId: this.chainId,
              assetNamespace: ASSET_NAMESPACE.suiCoin,
              assetReference: this.normalizeCoinType(change.coinType),
            })

        const amount = BigInt(change.amount)
        const isReceive = amount > 0n
        const isSend = amount < 0n

        const transferType = (() => {
          if (ownerAddress !== pubkey) return TransferType.Contract
          return isReceive ? TransferType.Receive : TransferType.Send
        })()

        // For Send transfers of native SUI, use PTB amount to exclude gas
        const shouldUsePtbAmount = isSend && ptbTransferAmount && isSuiCoin
        const transferValue = shouldUsePtbAmount
          ? ptbTransferAmount
          : (amount < 0n ? -amount : amount).toString()

        // ownerAddress is who owns the balance after the transaction
        // For Send: from = sender, to = recipient (from PTB if available, else ownerAddress)
        // For Receive: from = sender, to = ownerAddress (recipient)
        const from = [sender]
        const to = (() => {
          if (isReceive) return [ownerAddress]
          return ptbRecipient ? [ptbRecipient] : [sender]
        })()

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
