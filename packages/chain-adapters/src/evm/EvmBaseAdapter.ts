import { AssetId, ChainId, fromAssetId, fromChainId, toAssetId } from '@shapeshiftoss/caip'
import {
  ETHSignMessage,
  ETHSignTx,
  ETHWallet,
  supportsEthSwitchChain,
} from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import WAValidator from 'multicoin-address-validator'
import { numberToHex } from 'web3-utils'

import { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import {
  Account,
  BuildSendTxInput,
  FeeDataEstimate,
  GasFeeDataEstimate,
  GetAddressInput,
  GetBIP44ParamsInput,
  GetFeeDataInput,
  SignMessageInput,
  SignTx,
  SignTxInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TxHistoryInput,
  TxHistoryResponse,
  ValidAddressResult,
  ValidAddressResultType,
} from '../types'
import {
  chainIdToChainLabel,
  getAssetNamespace,
  toAddressNList,
  toRootDerivationPath,
} from '../utils'
import { bnOrZero } from '../utils/bignumber'
import { Fees } from './types'
import { getErc20Data } from './utils'

export const evmChainIds = [KnownChainIds.EthereumMainnet, KnownChainIds.AvalancheMainnet] as const

export type EvmChainId = typeof evmChainIds[number]

export const isEvmChainId = (
  maybeEvmChainId: string | EvmChainId,
): maybeEvmChainId is EvmChainId => {
  return evmChainIds.includes(maybeEvmChainId as EvmChainId)
}

export interface ChainAdapterArgs {
  chainId?: EvmChainId
  providers: {
    http: unchained.ethereum.V1Api | unchained.avalanche.V1Api
    ws: unchained.ws.Client<unchained.evm.types.Tx>
  }
  rpcUrl: string
}

export interface EvmBaseAdapterArgs extends ChainAdapterArgs {
  defaultBIP44Params: BIP44Params
  supportedChainIds: ChainId[]
  chainId: EvmChainId
}

export abstract class EvmBaseAdapter<T extends EvmChainId> implements IChainAdapter<T> {
  protected readonly chainId: EvmChainId
  protected readonly defaultBIP44Params: BIP44Params
  protected readonly supportedChainIds: ChainId[]
  protected readonly providers: {
    http: unchained.ethereum.V1Api | unchained.avalanche.V1Api
    ws: unchained.ws.Client<unchained.evm.types.Tx>
  }

  protected rpcUrl: string
  protected assetId: AssetId
  protected parser: unchained.evm.BaseTransactionParser<unchained.evm.types.Tx>

  protected constructor(args: EvmBaseAdapterArgs) {
    this.chainId = args.chainId
    this.defaultBIP44Params = args.defaultBIP44Params
    this.supportedChainIds = args.supportedChainIds
    this.providers = args.providers
    this.rpcUrl = args.rpcUrl

    if (!this.supportedChainIds.includes(this.chainId)) {
      throw new Error(`${this.chainId} not supported. (supported: ${this.supportedChainIds})`)
    }
  }

  abstract getType(): T
  abstract getFeeAssetId(): AssetId
  abstract getFeeData(input: Partial<GetFeeDataInput<T>>): Promise<FeeDataEstimate<T>>
  abstract getDisplayName(): string
  abstract getGasFeeData(): Promise<GasFeeDataEstimate>

  getChainId(): ChainId {
    return this.chainId
  }

  getRpcUrl(): string {
    return this.rpcUrl
  }

  buildBIP44Params(params: Partial<BIP44Params>): BIP44Params {
    return { ...this.defaultBIP44Params, ...params }
  }

  getBIP44Params({ accountNumber }: GetBIP44ParamsInput): BIP44Params {
    if (accountNumber < 0) {
      throw new Error('accountNumber must be >= 0')
    }
    return { ...this.defaultBIP44Params, accountNumber }
  }

  async buildSendTransaction(tx: BuildSendTxInput<T>): Promise<{
    txToSign: SignTx<T>
  }> {
    try {
      const { to, wallet, bip44Params = this.defaultBIP44Params, sendMax = false } = tx
      // If there is a mismatch between the current wallet's EVM chain ID and the adapter's chainId?
      // Switch the chain on wallet before building/sending the Tx
      if (supportsEthSwitchChain(wallet)) {
        const walletEvmChainId = await (wallet as ETHWallet).ethGetChainId?.()
        const adapterEvmChainId = fromChainId(this.chainId).chainReference
        if (!bnOrZero(walletEvmChainId).isEqualTo(adapterEvmChainId)) {
          await (wallet as ETHWallet).ethSwitchChain?.(bnOrZero(adapterEvmChainId).toNumber())
        }
      }
      const { erc20ContractAddress, gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas } =
        tx.chainSpecific

      if (!tx.to) throw new Error(`${this.getDisplayName()}ChainAdapter: to is required`)
      if (!tx.value) throw new Error(`${this.getDisplayName()}ChainAdapter: value is required`)

      const destAddress = erc20ContractAddress ?? to

      const from = await this.getAddress({ bip44Params, wallet })
      const account = await this.getAccount(from)

      const isErc20Send = !!erc20ContractAddress

      if (sendMax) {
        if (isErc20Send) {
          const erc20Balance = account.chainSpecific.tokens?.find((token) => {
            return fromAssetId(token.assetId).assetReference === erc20ContractAddress.toLowerCase()
          })?.balance
          if (!erc20Balance) throw new Error('no balance')
          tx.value = erc20Balance
        } else {
          if (bnOrZero(account.balance).isZero()) throw new Error('no balance')

          // (The type system guarantees that either maxFeePerGas or gasPrice will be undefined, but not both)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const fee = bnOrZero((maxFeePerGas ?? gasPrice)!).times(bnOrZero(gasLimit))
          tx.value = bnOrZero(account.balance).minus(fee).toString()
        }
      }
      const data = await getErc20Data(to, tx.value, erc20ContractAddress)

      const fees = ((): Fees => {
        if (maxFeePerGas && maxPriorityFeePerGas) {
          return {
            maxFeePerGas: numberToHex(maxFeePerGas),
            maxPriorityFeePerGas: numberToHex(maxPriorityFeePerGas),
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return { gasPrice: numberToHex(tx.chainSpecific.gasPrice!) }
      })()

      const txToSign = {
        addressNList: toAddressNList(bip44Params),
        value: numberToHex(isErc20Send ? '0' : tx.value),
        to: destAddress,
        chainId: Number(fromChainId(this.chainId).chainReference),
        data,
        nonce: numberToHex(account.chainSpecific.nonce),
        gasLimit: numberToHex(gasLimit),
        ...fees,
      } as SignTx<T>
      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getAccount(pubkey: string): Promise<Account<T>> {
    try {
      const data = await this.providers.http.getAccount({ pubkey })

      const balance = bnOrZero(data.balance).plus(bnOrZero(data.unconfirmedBalance))

      return {
        balance: balance.toString(),
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          nonce: data.nonce,
          tokens: data.tokens.map((token) => ({
            balance: token.balance,
            assetId: toAssetId({
              chainId: this.chainId,
              assetNamespace: getAssetNamespace(token.type),
              assetReference: token.contract,
            }),
          })),
        },
        pubkey: data.pubkey,
      } as Account<T>
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse> {
    const data = await this.providers.http.getTxHistory({
      pubkey: input.pubkey,
      pageSize: input.pageSize,
      cursor: input.cursor,
    })

    const txs = await Promise.all(
      data.txs.map(async (tx) => {
        const parsedTx = await this.parser.parse(tx, input.pubkey)

        return {
          address: input.pubkey,
          blockHash: parsedTx.blockHash,
          blockHeight: parsedTx.blockHeight,
          blockTime: parsedTx.blockTime,
          chainId: parsedTx.chainId,
          chain: this.getType(),
          confirmations: parsedTx.confirmations,
          txid: parsedTx.txid,
          fee: parsedTx.fee,
          status: parsedTx.status,
          trade: parsedTx.trade,
          transfers: parsedTx.transfers.map((transfer) => ({
            assetId: transfer.assetId,
            from: transfer.from,
            to: transfer.to,
            type: transfer.type,
            value: transfer.totalValue,
          })),
          data: parsedTx.data,
        }
      }),
    )

    return {
      cursor: data.cursor ?? '',
      pubkey: input.pubkey,
      transactions: txs,
    }
  }

  async signTransaction(signTxInput: SignTxInput<ETHSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput
      const signedTx = await (wallet as ETHWallet).ethSignTx(txToSign)

      if (!signedTx) throw new Error('Error signing tx')

      return signedTx.serialized
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async signAndBroadcastTransaction(signTxInput: SignTxInput<ETHSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput
      const txHash = await (wallet as ETHWallet)?.ethSendTx?.(txToSign)

      if (!txHash) throw new Error('Error signing & broadcasting tx')
      return txHash.hash
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async broadcastTransaction(hex: string) {
    return this.providers.http.sendTx({ sendTxBody: { hex } })
  }

  async signMessage(signMessageInput: SignMessageInput<ETHSignMessage>): Promise<string> {
    try {
      const { messageToSign, wallet } = signMessageInput
      const signedMessage = await (wallet as ETHWallet).ethSignMessage(messageToSign)

      if (!signedMessage) throw new Error('EvmBaseAdapter: error signing message')

      return signedMessage.signature
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    const { wallet, bip44Params = this.defaultBIP44Params, showOnDevice = false } = input
    const address = await (wallet as ETHWallet).ethGetAddress({
      addressNList: toAddressNList(bip44Params),
      showDisplay: showOnDevice,
    })

    if (!address) throw new Error('EvmBaseAdapter: no address available from wallet')

    return address
  }

  async validateAddress(address: string): Promise<ValidAddressResult> {
    const chainLabel = chainIdToChainLabel(this.chainId)
    const isValidAddress = WAValidator.validate(address, chainLabel)
    if (isValidAddress) return { valid: true, result: ValidAddressResultType.Valid }
    return { valid: false, result: ValidAddressResultType.Invalid }
  }

  async subscribeTxs(
    input: SubscribeTxsInput,
    onMessage: (msg: Transaction) => void,
    onError: (err: SubscribeError) => void,
  ): Promise<void> {
    const { wallet, bip44Params = this.defaultBIP44Params } = input

    const address = await this.getAddress({ wallet, bip44Params })
    const subscriptionId = toRootDerivationPath(bip44Params)

    await this.providers.ws.subscribeTxs(
      subscriptionId,
      { topic: 'txs', addresses: [address] },
      async (msg) => {
        const tx = await this.parser.parse(msg.data, msg.address)

        onMessage({
          address: tx.address,
          blockHash: tx.blockHash,
          blockHeight: tx.blockHeight,
          blockTime: tx.blockTime,
          chainId: tx.chainId,
          confirmations: tx.confirmations,
          fee: tx.fee,
          status: tx.status,
          trade: tx.trade,
          transfers: tx.transfers.map((transfer) => ({
            assetId: transfer.assetId,
            from: transfer.from,
            to: transfer.to,
            type: transfer.type,
            value: transfer.totalValue,
          })),
          txid: tx.txid,
          data: tx.data,
        })
      },
      (err) => onError({ message: err.message }),
    )
  }

  unsubscribeTxs(input?: SubscribeTxsInput): void {
    if (!input) return this.providers.ws.unsubscribeTxs()

    const { bip44Params = this.defaultBIP44Params } = input
    const subscriptionId = toRootDerivationPath(bip44Params)

    this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] })
  }

  closeTxs(): void {
    this.providers.ws.close('txs')
  }
}
