import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, fromChainId, toAssetId } from '@shapeshiftoss/caip'
import type { ETHSignMessage, ETHSignTx, ETHWallet, HDWallet } from '@shapeshiftoss/hdwallet-core'
import {
  supportsAvalanche,
  supportsBSC,
  supportsETH,
  supportsOptimism,
} from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import { utils } from 'ethers'
import WAValidator from 'multicoin-address-validator'
import { numberToHex } from 'web3-utils'

import type { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import type {
  Account,
  BuildSendTxInput,
  FeeDataEstimate,
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
} from '../types'
import { ValidAddressResultType } from '../types'
import {
  chainIdToChainLabel,
  getAssetNamespace,
  toAddressNList,
  toRootDerivationPath,
} from '../utils'
import { bnOrZero } from '../utils/bignumber'
import type { avalanche, bnbsmartchain, ethereum, optimism, polygon } from '.'
import type { BuildCustomTxInput, EstimateGasRequest, Fees, GasFeeDataEstimate } from './types'
import { getErc20Data } from './utils'

export const evmChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
] as const

export type EvmChainId = typeof evmChainIds[number]

export type EvmChainAdapter =
  | ethereum.ChainAdapter
  | avalanche.ChainAdapter
  | optimism.ChainAdapter
  | bnbsmartchain.ChainAdapter
  | polygon.ChainAdapter

export const isEvmChainId = (
  maybeEvmChainId: string | EvmChainId,
): maybeEvmChainId is EvmChainId => {
  return evmChainIds.includes(maybeEvmChainId as EvmChainId)
}

type EvmApi =
  | unchained.ethereum.V1Api
  | unchained.avalanche.V1Api
  | unchained.optimism.V1Api
  | unchained.bnbsmartchain.V1Api
  | unchained.polygon.V1Api

export interface ChainAdapterArgs<T = EvmApi> {
  chainId?: EvmChainId
  providers: {
    http: T
    ws: unchained.ws.Client<unchained.evm.types.Tx>
  }
  rpcUrl: string
}

export interface EvmBaseAdapterArgs extends ChainAdapterArgs {
  assetId: AssetId
  chainId: EvmChainId
  defaultBIP44Params: BIP44Params
  supportedChainIds: ChainId[]
  parser: unchained.evm.BaseTransactionParser<unchained.evm.types.Tx>
}

export abstract class EvmBaseAdapter<T extends EvmChainId> implements IChainAdapter<T> {
  protected readonly chainId: EvmChainId
  protected readonly defaultBIP44Params: BIP44Params
  protected readonly supportedChainIds: ChainId[]
  protected readonly providers: {
    http: EvmApi
    ws: unchained.ws.Client<unchained.evm.types.Tx>
  }

  protected rpcUrl: string
  protected assetId: AssetId
  protected parser: unchained.evm.BaseTransactionParser<unchained.evm.types.Tx>

  protected constructor(args: EvmBaseAdapterArgs) {
    this.assetId = args.assetId
    this.chainId = args.chainId
    this.defaultBIP44Params = args.defaultBIP44Params
    this.parser = args.parser
    this.providers = args.providers
    this.rpcUrl = args.rpcUrl
    this.supportedChainIds = args.supportedChainIds

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

  private supportsChain(wallet: HDWallet, chainReference?: number): wallet is ETHWallet {
    switch (chainReference ?? Number(fromChainId(this.chainId).chainReference)) {
      case Number(fromChainId(KnownChainIds.AvalancheMainnet).chainReference):
        return supportsAvalanche(wallet)
      case Number(fromChainId(KnownChainIds.BnbSmartChainMainnet).chainReference):
        return supportsBSC(wallet)
      case Number(fromChainId(KnownChainIds.EthereumMainnet).chainReference):
        return supportsETH(wallet)
      case Number(fromChainId(KnownChainIds.OptimismMainnet).chainReference):
        return supportsOptimism(wallet)
      case Number(fromChainId(KnownChainIds.PolygonMainnet).chainReference):
        return false
      default:
        return false
    }
  }

  private async assertSwitchChain(wallet: ETHWallet) {
    if (!wallet.ethGetChainId) return

    const walletChainReference = await wallet.ethGetChainId()
    const adapterChainReference = Number(fromChainId(this.chainId).chainReference)

    // switch chain not needed if wallet and adapter chains match
    if (walletChainReference === adapterChainReference) return

    // error if wallet and adapter chains don't match, but switch chain isn't supported by the wallet
    if (!wallet.ethSwitchChain) {
      throw new Error(
        `wallet does not support switching chains: wallet network (${walletChainReference}) and adapter network (${adapterChainReference}) do not match.`,
      )
    }

    // TODO: use asset-service baseAssets.ts after lib is moved into web (circular dependency)
    const targetNetwork = {
      [KnownChainIds.AvalancheMainnet]: {
        name: 'Avalanche',
        symbol: 'AVAX',
        explorer: 'https://snowtrace.io',
      },
      [KnownChainIds.BnbSmartChainMainnet]: {
        name: 'BNB',
        symbol: 'BNB',
        explorer: 'https://bscscan.com',
      },
      [KnownChainIds.PolygonMainnet]: {
        name: 'Polygon',
        symbol: 'MATIC',
        explorer: 'https://polygonscan.com/',
      },
      [KnownChainIds.EthereumMainnet]: {
        name: 'Ethereum',
        symbol: 'ETH',
        explorer: 'https://etherscan.io',
      },
      [KnownChainIds.OptimismMainnet]: {
        name: 'Ethereum',
        symbol: 'ETH',
        explorer: 'https://optimistic.etherscan.io',
      },
    }[this.chainId]

    await wallet.ethSwitchChain({
      chainId: utils.hexValue(adapterChainReference),
      chainName: this.getDisplayName(),
      nativeCurrency: {
        name: targetNetwork.name,
        symbol: targetNetwork.symbol,
        decimals: 18,
      },
      rpcUrls: [this.getRpcUrl()],
      blockExplorerUrls: [targetNetwork.explorer],
    })
  }

  async buildSendTransaction(tx: BuildSendTxInput<T>): Promise<{
    txToSign: SignTx<T>
  }> {
    try {
      const { to, wallet, accountNumber, sendMax = false } = tx
      const { tokenContractAddress, gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas } =
        tx.chainSpecific

      if (!tx.to) throw new Error(`${this.getName()}ChainAdapter: to is required`)
      if (!tx.value) throw new Error(`${this.getName()}ChainAdapter: value is required`)

      if (!this.supportsChain(wallet))
        throw new Error(`wallet does not support ${this.getDisplayName()}`)

      await this.assertSwitchChain(wallet)

      const destAddress = tokenContractAddress ?? to

      const from = await this.getAddress({ accountNumber, wallet })
      const account = await this.getAccount(from)

      const isTokenSend = !!tokenContractAddress

      if (sendMax) {
        if (isTokenSend) {
          const tokenBalance = account.chainSpecific.tokens?.find(token => {
            return fromAssetId(token.assetId).assetReference === tokenContractAddress.toLowerCase()
          })?.balance
          if (!tokenBalance) throw new Error('no balance')
          tx.value = tokenBalance
        } else {
          if (bnOrZero(account.balance).isZero()) throw new Error('no balance')

          // (The type system guarantees that either maxFeePerGas or gasPrice will be undefined, but not both)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const fee = bnOrZero((maxFeePerGas ?? gasPrice)!).times(bnOrZero(gasLimit))
          tx.value = bnOrZero(account.balance).minus(fee).toString()
        }
      }
      const data = tx.memo || (await getErc20Data(to, tx.value, tokenContractAddress))

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
        value: numberToHex(isTokenSend ? '0' : tx.value),
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

  protected async buildEstimateGasRequest({
    memo,
    to,
    value,
    chainSpecific: { contractAddress, from, contractData },
    sendMax = false,
  }: GetFeeDataInput<T>): Promise<EstimateGasRequest> {
    const isTokenSend = !!contractAddress

    // get the exact send max value for an erc20 send to ensure we have the correct input data when estimating fees
    if (sendMax && isTokenSend) {
      const account = await this.getAccount(from)
      const tokenBalance = account.chainSpecific.tokens?.find(token => {
        const { assetReference } = fromAssetId(token.assetId)
        return assetReference === contractAddress.toLowerCase()
      })?.balance

      if (!tokenBalance) throw new Error('no balance')

      value = tokenBalance
    }

    const data = memo || contractData || (await getErc20Data(to, value, contractAddress))

    return {
      from,
      to: isTokenSend ? contractAddress : to,
      value: isTokenSend ? '0' : value,
      data,
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
          tokens: data.tokens.map(token => ({
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
      data.txs.map(async tx => {
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
          transfers: parsedTx.transfers.map(transfer => ({
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

      if (!this.supportsChain(wallet, txToSign.chainId))
        throw new Error(`wallet does not support chain reference: ${txToSign.chainId}`)

      const signedTx = await wallet.ethSignTx(txToSign)

      if (!signedTx) throw new Error('Error signing tx')

      return signedTx.serialized
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async signAndBroadcastTransaction(signTxInput: SignTxInput<ETHSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      if (!this.supportsChain(wallet, txToSign.chainId))
        throw new Error(`wallet does not support chain reference: ${txToSign.chainId}`)

      await this.assertSwitchChain(wallet)

      const txHash = await wallet.ethSendTx?.(txToSign)

      if (!txHash) throw new Error('Error signing & broadcasting tx')

      return txHash.hash
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  broadcastTransaction(hex: string): Promise<string> {
    return this.providers.http.sendTx({ sendTxBody: { hex } })
  }

  async signMessage(signMessageInput: SignMessageInput<ETHSignMessage>): Promise<string> {
    try {
      const { messageToSign, wallet } = signMessageInput

      if (!this.supportsChain(wallet))
        throw new Error(`wallet does not support ${this.getDisplayName()}`)

      const signedMessage = await wallet.ethSignMessage(messageToSign)

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

  // eslint-disable-next-line require-await
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
      async msg => {
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
          transfers: tx.transfers.map(transfer => ({
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
      err => onError({ message: err.message }),
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

  async buildCustomTx(tx: BuildCustomTxInput): Promise<{ txToSign: SignTx<T> }> {
    try {
      const { to, wallet, accountNumber, data, value } = tx
      const { gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas } = tx

      if (!this.supportsChain(wallet))
        throw new Error(`wallet does not support ${this.getDisplayName()}`)

      await this.assertSwitchChain(wallet)

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
      const txToSign = {
        addressNList: toAddressNList(bip44Params),
        value,
        to,
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
}
