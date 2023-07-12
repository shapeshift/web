import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromAssetId, fromChainId, toAssetId } from '@shapeshiftoss/caip'
import type {
  ETHSignMessage,
  ETHSignTx,
  ETHSignTypedData,
  ETHWallet,
  HDWallet,
} from '@shapeshiftoss/hdwallet-core'
import {
  supportsAvalanche,
  supportsBSC,
  supportsETH,
  supportsGnosis,
  supportsOptimism,
  supportsPolygon,
} from '@shapeshiftoss/hdwallet-core'
import type { BIP44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'
import { utils } from 'ethers'
import { numberToHex } from 'web3-utils'

import type { ChainAdapter as IChainAdapter } from '../api'
import { ErrorHandler } from '../error/ErrorHandler'
import type {
  Account,
  BuildSendApiTxInput,
  BuildSendTxInput,
  FeeDataEstimate,
  GetAddressInput,
  GetBIP44ParamsInput,
  GetFeeDataInput,
  SignMessageInput,
  SignTx,
  SignTxInput,
  SignTypedDataInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TxHistoryInput,
  TxHistoryResponse,
  ValidAddressResult,
} from '../types'
import { ValidAddressResultType } from '../types'
import { getAssetNamespace, toAddressNList, toRootDerivationPath } from '../utils'
import { bnOrZero } from '../utils/bignumber'
import type { avalanche, bnbsmartchain, ethereum, gnosis, optimism, polygon } from '.'
import type {
  BuildCustomApiTxInput,
  BuildCustomTxInput,
  EstimateGasRequest,
  Fees,
  GasFeeDataEstimate,
} from './types'
import { getErc20Data } from './utils'

export const evmChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.GnosisMainnet,
] as const

export type EvmChainId = typeof evmChainIds[number]

export type EvmChainAdapter =
  | ethereum.ChainAdapter
  | avalanche.ChainAdapter
  | optimism.ChainAdapter
  | bnbsmartchain.ChainAdapter
  | polygon.ChainAdapter
  | gnosis.ChainAdapter

export const isEvmChainId = (
  maybeEvmChainId: string | EvmChainId,
): maybeEvmChainId is EvmChainId => {
  return evmChainIds.includes(maybeEvmChainId as EvmChainId)
}

export interface ChainAdapterArgs<T = unchained.evm.Api> {
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
    http: unchained.evm.Api
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
  abstract getName(): string
  abstract getDisplayName(): string

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

  supportsChain(wallet: HDWallet, chainReference?: number): wallet is ETHWallet {
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
        return supportsPolygon(wallet)
      case Number(fromChainId(KnownChainIds.GnosisMainnet).chainReference):
        return supportsGnosis(wallet)
      default:
        return false
    }
  }

  async assertSwitchChain(wallet: ETHWallet) {
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
      [KnownChainIds.GnosisMainnet]: {
        name: 'xDAI',
        symbol: 'xDAI',
        explorer: 'https://gnosisscan.io/',
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

  async buildSendApiTransaction(input: BuildSendApiTxInput<T>): Promise<SignTx<T>> {
    try {
      const { to, from, value, accountNumber, chainSpecific, sendMax = false } = input
      const { data, contractAddress, gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas } =
        chainSpecific

      if (!to) throw new Error(`${this.getName()}ChainAdapter: to is required`)
      if (!value) throw new Error(`${this.getName()}ChainAdapter: value is required`)
      if (!gasLimit) throw new Error(`${this.getName()}ChainAdapter: gasLimit is required`)

      const account = await this.getAccount(from)

      const isTokenSend = !!contractAddress

      const _value = (() => {
        if (!sendMax) return value

        if (isTokenSend) {
          const tokenBalance = account.chainSpecific.tokens?.find(token => {
            return fromAssetId(token.assetId).assetReference === contractAddress.toLowerCase()
          })?.balance

          if (!tokenBalance) throw new Error('no balance')

          return tokenBalance
        }

        if (bnOrZero(account.balance).isZero()) throw new Error('no balance')

        const fee = bnOrZero(maxFeePerGas ?? gasPrice).times(bnOrZero(gasLimit))

        return bnOrZero(account.balance).minus(fee).toString()
      })()

      const fees = ((): Fees => {
        if (maxFeePerGas && maxPriorityFeePerGas) {
          return {
            maxFeePerGas: numberToHex(maxFeePerGas),
            maxPriorityFeePerGas: numberToHex(maxPriorityFeePerGas),
          }
        }

        return { gasPrice: numberToHex(gasPrice!) }
      })()

      const txToSign = {
        addressNList: toAddressNList(this.getBIP44Params({ accountNumber })),
        value: numberToHex(isTokenSend ? '0' : _value),
        to: isTokenSend ? contractAddress : to,
        chainId: Number(fromChainId(this.chainId).chainReference),
        data: data || (await getErc20Data(to, _value, contractAddress)),
        nonce: numberToHex(account.chainSpecific.nonce),
        gasLimit: numberToHex(gasLimit),
        ...fees,
      } as SignTx<T>

      return txToSign
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<T>): Promise<{
    txToSign: SignTx<T>
  }> {
    try {
      if (!this.supportsChain(input.wallet)) {
        throw new Error(`wallet does not support ${this.getDisplayName()}`)
      }

      await this.assertSwitchChain(input.wallet)

      const from = await this.getAddress(input)
      const txToSign = await this.buildSendApiTransaction({ ...input, from })

      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  protected async buildEstimateGasRequest({
    to,
    value,
    chainSpecific: { contractAddress, from, data },
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

    return {
      from,
      to: isTokenSend ? contractAddress : to,
      value: isTokenSend ? '0' : value,
      data: data || (await getErc20Data(to, value, contractAddress)),
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
              assetReference: token.id ? `${token.contract}/${token.id}` : token.contract,
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
            id: transfer.id,
            token: transfer.token,
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

  async signTypedData(input: SignTypedDataInput<ETHSignTypedData>): Promise<string> {
    try {
      const { typedDataToSign, wallet } = input

      if (!this.supportsChain(wallet)) {
        throw new Error(`wallet does not support ${this.getDisplayName()}`)
      }

      if (!wallet.ethSignTypedData) {
        throw new Error('wallet does not support signing typed data')
      }

      const result = await wallet.ethSignTypedData(typedDataToSign)

      if (!result) throw new Error('EvmBaseAdapter: error signing typed data')

      return result.signature
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
    const isValidAddress = utils.isAddress(address)
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
            id: transfer.id,
            token: transfer.token,
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

  async buildCustomApiTx(input: BuildCustomApiTxInput): Promise<SignTx<T>> {
    try {
      const { to, from, accountNumber, data, value } = input
      const { gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas } = input

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
        value: numberToHex(value),
        to,
        chainId: Number(fromChainId(this.chainId).chainReference),
        data,
        nonce: numberToHex(account.chainSpecific.nonce),
        gasLimit: numberToHex(gasLimit),
        ...fees,
      } as SignTx<T>

      return txToSign
    } catch (err) {
      return ErrorHandler(err)
    }
  }

  async buildCustomTx(input: BuildCustomTxInput): Promise<{ txToSign: SignTx<T> }> {
    try {
      const { wallet, accountNumber } = input

      if (!this.supportsChain(wallet)) {
        throw new Error(`wallet does not support ${this.getDisplayName()}`)
      }

      await this.assertSwitchChain(wallet)

      const from = await this.getAddress({ accountNumber, wallet })
      const txToSign = await this.buildCustomApiTx({ ...input, from })

      return { txToSign }
    } catch (err) {
      return ErrorHandler(err)
    }
  }
  async getGasFeeData(): Promise<GasFeeDataEstimate> {
    const { fast, average, slow } = await this.providers.http.getGasFees()
    return { fast, average, slow }
  }

  async getFeeData(input: GetFeeDataInput<T>): Promise<FeeDataEstimate<T>> {
    const req = await this.buildEstimateGasRequest(input)

    const { gasLimit } = await this.providers.http.estimateGas(req)
    const { fast, average, slow } = await this.getGasFeeData()

    return {
      fast: {
        txFee: bnOrZero(
          BigNumber.max(fast.gasPrice, fast.maxFeePerGas ?? 0).times(gasLimit),
        ).toFixed(0),
        chainSpecific: { gasLimit, ...fast },
      },
      average: {
        txFee: bnOrZero(
          BigNumber.max(average.gasPrice, average.maxFeePerGas ?? 0).times(gasLimit),
        ).toFixed(0),
        chainSpecific: { gasLimit, ...average },
      },
      slow: {
        txFee: bnOrZero(
          BigNumber.max(slow.gasPrice, slow.maxFeePerGas ?? 0).times(gasLimit),
        ).toFixed(0),
        chainSpecific: { gasLimit, ...slow },
      },
    } as FeeDataEstimate<T>
  }

  get httpProvider(): unchained.evm.Api {
    return this.providers.http
  }

  get wsProvider(): unchained.ws.Client<unchained.evm.types.Tx> {
    return this.providers.ws
  }
}
