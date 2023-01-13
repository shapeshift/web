import { AssetId, ChainId, fromAssetId, fromChainId, toAssetId } from '@shapeshiftoss/caip'
import {
  ETHSignMessage,
  ETHSignTx,
  ETHWallet,
  supportsEthSwitchChain,
} from '@shapeshiftoss/hdwallet-core'
import { BIP44Params, KnownChainIds } from '@shapeshiftoss/types'
import * as unchained from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'
import { utils } from 'ethers'
import WAValidator from 'multicoin-address-validator'
import { numberToHex } from 'web3-utils'

import { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import {
  Account,
  BuildSendTxInput,
  EstimateFeeDataInput,
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
import { bn, bnOrZero } from '../utils/bignumber'
import { BuildCustomTxInput, Fees } from './types'
import { getErc20Data, getGeneratedAssetData } from './utils'

export const evmChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
] as const

export type EvmChainId = typeof evmChainIds[number]

export const isEvmChainId = (
  maybeEvmChainId: string | EvmChainId,
): maybeEvmChainId is EvmChainId => {
  return evmChainIds.includes(maybeEvmChainId as EvmChainId)
}

type ConfirmationSpeed = 'slow' | 'average' | 'fast'

export const calcFee = (
  fee: string | number | BigNumber,
  speed: ConfirmationSpeed,
  normalizationConstants: Record<ConfirmationSpeed, BigNumber>,
): string => {
  return bnOrZero(fee)
    .times(normalizationConstants[speed])
    .toFixed(0, BigNumber.ROUND_CEIL)
    .toString()
}

export interface ChainAdapterArgs {
  chainId?: EvmChainId
  providers: {
    http: unchained.ethereum.V1Api | unchained.avalanche.V1Api | unchained.optimism.V1Api
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
    http: unchained.ethereum.V1Api | unchained.avalanche.V1Api | unchained.optimism.V1Api
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
  abstract getName(): string
  abstract getDisplayName(): string
  abstract getGasFeeData(): Promise<GasFeeDataEstimate>

  getChainId(): ChainId {
    return this.chainId
  }

  getRpcUrl(): string {
    return this.rpcUrl
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
      const { to, wallet, accountNumber, sendMax = false } = tx
      // If there is a mismatch between the current wallet's EVM chain ID and the adapter's chainId?
      // Switch the chain on wallet before building/sending the Tx
      if (supportsEthSwitchChain(wallet)) {
        const assets = await getGeneratedAssetData()
        const feeAsset = assets[this.getFeeAssetId()]

        const walletEthNetwork = await wallet.ethGetChainId?.()
        const adapterEthNetwork = Number(fromChainId(this.chainId).chainReference)

        if (!bnOrZero(walletEthNetwork).isEqualTo(adapterEthNetwork)) {
          await wallet.ethSwitchChain?.({
            chainId: utils.hexValue(adapterEthNetwork),
            chainName: this.getDisplayName(),
            nativeCurrency: {
              name: feeAsset.name,
              symbol: feeAsset.symbol,
              decimals: 18,
            },
            rpcUrls: [this.getRpcUrl()],
            blockExplorerUrls: [feeAsset.explorer],
          })
        }
      }
      const { erc20ContractAddress, gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas } =
        tx.chainSpecific

      if (!tx.to) throw new Error(`${this.getName()}ChainAdapter: to is required`)
      if (!tx.value) throw new Error(`${this.getName()}ChainAdapter: value is required`)

      const destAddress = erc20ContractAddress ?? to

      const from = await this.getAddress({ accountNumber, wallet })
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

      const bip44Params = this.getBIP44Params({ accountNumber })
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

  protected async estimateFeeData({
    to,
    value,
    chainSpecific: { contractAddress, from, contractData },
    sendMax = false,
    gasFeeData: { fast, average, slow },
  }: EstimateFeeDataInput<T>): Promise<FeeDataEstimate<EvmChainId>> {
    const isErc20Send = !!contractAddress

    // get the exact send max value for an erc20 send to ensure we have the correct input data when estimating fees
    if (sendMax && isErc20Send) {
      const account = await this.getAccount(from)
      const erc20Balance = account.chainSpecific.tokens?.find((token) => {
        const { assetReference } = fromAssetId(token.assetId)
        return assetReference === contractAddress.toLowerCase()
      })?.balance

      if (!erc20Balance) throw new Error('no balance')

      value = erc20Balance
    }

    const data = contractData ?? (await getErc20Data(to, value, contractAddress))

    const gasLimit = await this.providers.http.estimateGas({
      from,
      to: isErc20Send ? contractAddress : to,
      value: isErc20Send ? '0' : value,
      data,
    })

    return {
      fast: {
        txFee: bnOrZero(bn(fast.gasPrice).times(gasLimit)).toPrecision(),
        chainSpecific: { gasLimit, ...fast },
      },
      average: {
        txFee: bnOrZero(bn(average.gasPrice).times(gasLimit)).toPrecision(),
        chainSpecific: { gasLimit, ...average },
      },
      slow: {
        txFee: bnOrZero(bn(slow.gasPrice).times(gasLimit)).toPrecision(),
        chainSpecific: { gasLimit, ...slow },
      },
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
      const assets = await getGeneratedAssetData()
      const feeAsset = assets[this.getFeeAssetId()]
      // If there is a mismatch between the current wallet's EVM chain ID and the adapter's chainId?
      // Switch the chain on wallet before building/sending the Tx
      if (supportsEthSwitchChain(wallet)) {
        const walletEthNetwork = await wallet.ethGetChainId?.()
        const adapterEthNetwork = Number(fromChainId(this.chainId).chainReference)

        if (typeof walletEthNetwork !== 'number') {
          throw new Error('Error getting wallet ethNetwork')
        }

        if (!(walletEthNetwork === adapterEthNetwork)) {
          await (wallet as ETHWallet).ethSwitchChain?.({
            chainId: utils.hexValue(adapterEthNetwork),
            chainName: this.getDisplayName(),
            nativeCurrency: {
              name: feeAsset.name,
              symbol: feeAsset.symbol,
              decimals: 18,
            },
            rpcUrls: [this.getRpcUrl()],
            blockExplorerUrls: [feeAsset.explorer],
          })
        }
      }
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
    const { accountNumber, wallet, showOnDevice = false } = input
    const bip44Params = this.getBIP44Params({ accountNumber })
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
    const { accountNumber, wallet } = input

    const address = await this.getAddress({ accountNumber, wallet })
    const bip44Params = this.getBIP44Params({ accountNumber })
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

    const { accountNumber } = input
    const bip44Params = this.getBIP44Params({ accountNumber })
    const subscriptionId = toRootDerivationPath(bip44Params)

    this.providers.ws.unsubscribeTxs(subscriptionId, { topic: 'txs', addresses: [] })
  }

  closeTxs(): void {
    this.providers.ws.close('txs')
  }

  async buildCustomTx({
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasPrice,
    value,
    data,
    gasLimit,
    to,
    wallet,
    accountNumber,
  }: BuildCustomTxInput): Promise<{
    txToSign: ETHSignTx
  }> {
    try {
      const chainReference = fromChainId(this.chainId).chainReference
      const from = await this.getAddress({ accountNumber, wallet })
      const account = await this.getAccount(from)

      const fees: Fees =
        maxFeePerGas && maxPriorityFeePerGas
          ? {
              maxFeePerGas: numberToHex(maxFeePerGas),
              maxPriorityFeePerGas: numberToHex(maxPriorityFeePerGas),
            }
          : { gasPrice: numberToHex(gasPrice ?? '0') }

      const bip44Params = this.getBIP44Params({ accountNumber })
      const txToSign: ETHSignTx = {
        addressNList: toAddressNList(bip44Params),
        value,
        to,
        chainId: Number(chainReference),
        data,
        nonce: numberToHex(account.chainSpecific.nonce),
        gasLimit: numberToHex(gasLimit),
        ...fees,
      }

      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }
}
