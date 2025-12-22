import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, starknetAssetId, starknetChainId } from '@shapeshiftoss/caip'
import type { HDWallet, StarknetWallet } from '@shapeshiftoss/hdwallet-core'
import { supportsStarknet } from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { Call } from 'starknet'
import { RpcProvider, validateAndParseAddress } from 'starknet'

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

export class ChainAdapter implements IChainAdapter<KnownChainIds.StarknetMainnet> {
  static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Starknet),
    accountNumber: 0,
  }

  protected readonly chainId = starknetChainId
  protected readonly assetId = starknetAssetId

  protected provider: RpcProvider

  constructor(args: ChainAdapterArgs) {
    this.provider = new RpcProvider({ nodeUrl: args.rpcUrl })
  }

  private assertSupportsChain(wallet: HDWallet): asserts wallet is StarknetWallet {
    if (!supportsStarknet(wallet)) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  getName() {
    return 'Starknet'
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Starknet
  }

  getType(): KnownChainIds.StarknetMainnet {
    return KnownChainIds.StarknetMainnet
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

      const address = await wallet.starknetGetAddress({
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

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.StarknetMainnet>> {
    try {
      const nativeBalance = await (this.provider as any).getBalance(pubkey)

      const tokens: {
        assetId: AssetId
        balance: string
        symbol: string
        name: string
        precision: number
      }[] = []

      return {
        balance: String(nativeBalance),
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
      validateAndParseAddress(address)
      return Promise.resolve({ valid: true, result: ValidAddressResultType.Valid })
    } catch (err) {
      return Promise.resolve({ valid: false, result: ValidAddressResultType.Invalid })
    }
  }

  getStarknetProvider(): RpcProvider {
    return this.provider
  }

  getTxHistory(): Promise<never> {
    throw new Error('Starknet transaction history not yet implemented')
  }

  // eslint-disable-next-line require-await
  async buildSendApiTransaction(
    input: BuildSendApiTxInput<KnownChainIds.StarknetMainnet>,
  ): Promise<SignTx<KnownChainIds.StarknetMainnet>> {
    try {
      const { from, to, value, chainSpecific } = input
      const { tokenContractAddress, maxFee } = chainSpecific

      let call: Call

      if (tokenContractAddress) {
        const uint256Value = {
          low: BigInt(value) & BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'),
          high: BigInt(value) >> BigInt(128),
        }

        call = {
          contractAddress: tokenContractAddress,
          entrypoint: 'transfer',
          calldata: [to, uint256Value.low.toString(), uint256Value.high.toString()],
        }
      } else {
        call = {
          contractAddress: to,
          entrypoint: 'transfer',
          calldata: [value],
        }
      }

      return {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber: input.accountNumber })),
        call,
        fromAddress: from,
        maxFee: maxFee || '0',
      } as unknown as SignTx<KnownChainIds.StarknetMainnet>
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<KnownChainIds.StarknetMainnet>): Promise<{
    txToSign: SignTx<KnownChainIds.StarknetMainnet>
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
    signTxInput: SignTxInput<SignTx<KnownChainIds.StarknetMainnet>>,
  ): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!wallet) throw new Error('wallet is required')
      this.assertSupportsChain(wallet)

      await verifyLedgerAppOpen(this.chainId, wallet)

      const signedTx = await wallet.starknetSignTx(txToSign)

      if (!signedTx?.signature) {
        throw new Error('error signing tx - missing signature')
      }

      return JSON.stringify(signedTx)
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signTransaction',
      })
    }
  }

  async signAndBroadcastTransaction({
    signTxInput,
  }: SignAndBroadcastTransactionInput<KnownChainIds.StarknetMainnet>): Promise<string> {
    try {
      const signedHex = await this.signTransaction(signTxInput)
      return await this.broadcastTransaction({
        hex: signedHex,
        senderAddress: '',
        receiverAddress: '',
      })
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signAndBroadcastTransaction',
      })
    }
  }

  async broadcastTransaction(input: BroadcastTransactionInput): Promise<string> {
    try {
      const { hex } = input
      const signedTx = JSON.parse(hex)

      const result = await (this.provider as any).invokeFunction(signedTx)

      return result.transaction_hash
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  // eslint-disable-next-line require-await
  async getFeeData(): Promise<FeeDataEstimate<KnownChainIds.StarknetMainnet>> {
    try {
      const estimatedFee = '1000000000000000'

      const maxFee = ((BigInt(estimatedFee) * BigInt(120)) / BigInt(100)).toString()

      return {
        fast: {
          txFee: estimatedFee,
          chainSpecific: { maxFee },
        },
        average: {
          txFee: estimatedFee,
          chainSpecific: { maxFee },
        },
        slow: {
          txFee: estimatedFee,
          chainSpecific: { maxFee },
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
      const txHash =
        typeof txHashOrTx === 'string' ? txHashOrTx : (txHashOrTx as any).transaction_hash

      const receipt: any = await this.provider.getTransactionReceipt(txHash)

      const status =
        receipt.execution_status === 'SUCCEEDED'
          ? TxStatus.Confirmed
          : receipt.execution_status === 'REVERTED'
          ? TxStatus.Failed
          : TxStatus.Unknown

      const fee = receipt.actual_fee
        ? {
            assetId: this.assetId,
            value: String(receipt.actual_fee),
          }
        : undefined

      return {
        txid: txHash,
        blockHeight: Number(receipt.block_number ?? 0),
        blockTime: 0,
        blockHash: receipt.block_hash ?? '',
        chainId: this.chainId,
        confirmations: 1,
        status,
        fee,
        transfers: [],
        pubkey,
      }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.parseTx',
      })
    }
  }
}
