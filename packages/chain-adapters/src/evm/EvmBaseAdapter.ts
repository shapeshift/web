import type { AssetId, ChainId } from '@shapeshiftoss/caip'
import { fromChainId, toAssetId } from '@shapeshiftoss/caip'
import type {
  ETHSignMessage,
  ETHSignTx,
  ETHSignTypedData,
  ETHWallet,
  HDWallet,
} from '@shapeshiftoss/hdwallet-core'
import {
  supportsArbitrum,
  supportsArbitrumNova,
  supportsAvalanche,
  supportsBase,
  supportsBSC,
  supportsETH,
  supportsGnosis,
  supportsOptimism,
  supportsPolygon,
} from '@shapeshiftoss/hdwallet-core'
import type { Bip44Params, EvmChainId, RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import type * as unchained from '@shapeshiftoss/unchained-client'
import BigNumber from 'bignumber.js'
import PQueue from 'p-queue'
import { isAddress, toHex } from 'viem'

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
import { CONTRACT_INTERACTION, ValidAddressResultType } from '../types'
import {
  getAssetNamespace,
  toAddressNList,
  toRootDerivationPath,
  verifyLedgerAppOpen,
} from '../utils'
import { bnOrZero } from '../utils/bignumber'
import { assertAddressNotSanctioned } from '../utils/validateAddress'
import type {
  arbitrum,
  arbitrumNova,
  avalanche,
  base,
  bnbsmartchain,
  ethereum,
  gnosis,
  optimism,
  polygon,
} from '.'
import type {
  BuildCustomApiTxInput,
  BuildCustomTxInput,
  EstimateGasRequest,
  GasFeeDataEstimate,
  NetworkFees,
} from './types'
import { getErc20Data } from './utils'

export const evmChainIds = [
  KnownChainIds.EthereumMainnet,
  KnownChainIds.AvalancheMainnet,
  KnownChainIds.OptimismMainnet,
  KnownChainIds.BnbSmartChainMainnet,
  KnownChainIds.PolygonMainnet,
  KnownChainIds.GnosisMainnet,
  KnownChainIds.ArbitrumMainnet,
  KnownChainIds.ArbitrumNovaMainnet,
  KnownChainIds.BaseMainnet,
] as const

export type EvmChainAdapter =
  | ethereum.ChainAdapter
  | avalanche.ChainAdapter
  | optimism.ChainAdapter
  | bnbsmartchain.ChainAdapter
  | polygon.ChainAdapter
  | gnosis.ChainAdapter
  | arbitrum.ChainAdapter
  | arbitrumNova.ChainAdapter
  | base.ChainAdapter

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
  rootBip44Params: RootBip44Params
  supportedChainIds: ChainId[]
  parser: unchained.evm.BaseTransactionParser<unchained.evm.types.Tx>
}

export abstract class EvmBaseAdapter<T extends EvmChainId> implements IChainAdapter<T> {
  protected readonly chainId: EvmChainId
  protected readonly rootBip44Params: RootBip44Params
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
    this.rootBip44Params = args.rootBip44Params
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

  getBip44Params({ accountNumber }: GetBip44ParamsInput): Bip44Params {
    if (accountNumber < 0) throw new Error('accountNumber must be >= 0')
    return { ...this.rootBip44Params, accountNumber, isChange: false, addressIndex: 0 }
  }

  protected assertSupportsChain(
    wallet: HDWallet,
    chainReference?: number,
  ): asserts wallet is ETHWallet {
    const support = (() => {
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
        case Number(fromChainId(KnownChainIds.ArbitrumMainnet).chainReference):
          return supportsArbitrum(wallet)
        case Number(fromChainId(KnownChainIds.ArbitrumNovaMainnet).chainReference):
          return supportsArbitrumNova(wallet)
        case Number(fromChainId(KnownChainIds.BaseMainnet).chainReference):
          return supportsBase(wallet)
        default:
          return false
      }
    })()

    if (!support) {
      throw new ChainAdapterError(`wallet does not support: ${this.getDisplayName()}`, {
        translation: 'chainAdapters.errors.unsupportedChain',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  protected async assertSwitchChain(wallet: ETHWallet) {
    if (!wallet.ethGetChainId) return

    const walletChainReference = await wallet.ethGetChainId()
    const adapterChainReference = Number(fromChainId(this.chainId).chainReference)

    // switch chain not needed if wallet and adapter chains match
    if (walletChainReference === adapterChainReference) return

    // error if wallet and adapter chains don't match, but switch chain isn't supported by the wallet
    if (!wallet.ethSwitchChain) {
      throw new ChainAdapterError(
        `wallet does not support switching chains: wallet network (${walletChainReference}) and adapter network (${adapterChainReference}) do not match.`,
        { translation: 'chainAdapters.errors.switchChainUnsupported' },
      )
    }

    // TODO: use asset-service baseAssets.ts after lib is moved into web (circular dependency)
    const targetNetwork = {
      [KnownChainIds.AvalancheMainnet]: {
        name: 'Avalanche',
        symbol: 'AVAX',
        explorer: 'https://snowtrace.dev',
      },
      [KnownChainIds.BnbSmartChainMainnet]: {
        name: 'BNB',
        symbol: 'BNB',
        explorer: 'https://bscscan.com',
      },
      [KnownChainIds.PolygonMainnet]: {
        name: 'Polygon Ecosystem Token',
        symbol: 'POL',
        explorer: 'https://polygonscan.com/',
      },
      [KnownChainIds.GnosisMainnet]: {
        name: 'xDAI',
        symbol: 'xDAI',
        explorer: 'https://gnosis.blockscout.com',
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
      [KnownChainIds.ArbitrumMainnet]: {
        name: 'Ethereum',
        symbol: 'ETH',
        explorer: 'https://arbiscan.io',
      },
      [KnownChainIds.ArbitrumNovaMainnet]: {
        name: 'Ethereum',
        symbol: 'ETH',
        explorer: 'https://nova.arbiscan.io',
      },
      [KnownChainIds.BaseMainnet]: {
        name: 'Ethereum',
        symbol: 'ETH',
        explorer: 'https://basescan.org',
      },
    }[this.chainId]

    try {
      await wallet.ethSwitchChain({
        chainId: toHex(adapterChainReference),
        chainName: this.getDisplayName(),
        nativeCurrency: {
          name: targetNetwork.name,
          symbol: targetNetwork.symbol,
          decimals: 18,
        },
        rpcUrls: [this.getRpcUrl()],
        blockExplorerUrls: [targetNetwork.explorer],
      })
    } catch (err) {
      throw new ChainAdapterError(err, {
        translation: 'chainAdapters.errors.switchChainFailed',
        options: { chain: this.getDisplayName() },
      })
    }
  }

  async buildSendApiTransaction(input: BuildSendApiTxInput<T>): Promise<SignTx<T>> {
    try {
      const { to, from, value, accountNumber, chainSpecific, customNonce } = input
      const { data, contractAddress, gasPrice, gasLimit, maxFeePerGas, maxPriorityFeePerGas } =
        chainSpecific

      if (!to) throw new Error('to is required')
      if (!value) throw new Error('value is required')
      if (!gasLimit) throw new Error('gasLimit is required')

      const account = await this.getAccount(from)

      const isTokenSend = !!contractAddress

      const fees = ((): NetworkFees => {
        if (maxFeePerGas && maxPriorityFeePerGas) {
          return {
            maxFeePerGas: toHex(BigInt(maxFeePerGas)),
            maxPriorityFeePerGas: toHex(BigInt(maxPriorityFeePerGas)),
          }
        }

        return { gasPrice: toHex(BigInt(gasPrice!)) }
      })()

      const nonce =
        customNonce !== undefined
          ? toHex(BigInt(customNonce))
          : toHex(BigInt(account.chainSpecific.nonce))

      const txToSign = {
        addressNList: toAddressNList(this.getBip44Params({ accountNumber })),
        value: toHex(isTokenSend ? 0n : BigInt(value)),
        to: isTokenSend ? contractAddress : to,
        chainId: Number(fromChainId(this.chainId).chainReference),
        data: data || (await getErc20Data(to, value, contractAddress)) || '0x',
        nonce,
        gasLimit: toHex(BigInt(gasLimit)),
        ...fees,
      } as SignTx<T>

      return txToSign
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildSendTransaction(input: BuildSendTxInput<T>): Promise<{
    txToSign: SignTx<T>
  }> {
    try {
      this.assertSupportsChain(input.wallet)

      const from = await this.getAddress(input)
      const txToSign = await this.buildSendApiTransaction({ ...input, from })

      return { txToSign }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  protected async buildEstimateGasRequest({
    to,
    value,
    chainSpecific: { contractAddress, from, data },
  }: GetFeeDataInput<T>): Promise<EstimateGasRequest> {
    const isTokenSend = !!contractAddress

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
            name: token.name,
            precision: token.decimals,
            symbol: token.symbol,
          })),
        },
        pubkey,
      } as Account<T>
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getAccount',
        options: { pubkey },
      })
    }
  }

  async getTxHistory(input: TxHistoryInput): Promise<TxHistoryResponse> {
    const requestQueue = input.requestQueue ?? new PQueue()

    const data = await requestQueue.add(() =>
      this.providers.http.getTxHistory({
        pubkey: input.pubkey,
        pageSize: input.pageSize,
        cursor: input.cursor,
      }),
    )

    const transactions = await Promise.all(
      data.txs.map(tx => requestQueue.add(() => this.parseTx(tx, input.pubkey))),
    )

    return {
      cursor: data.cursor ?? '',
      pubkey: input.pubkey,
      transactions,
    }
  }

  async signTransaction(signTxInput: SignTxInput<ETHSignTx>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      this.assertSupportsChain(wallet, txToSign.chainId)
      await verifyLedgerAppOpen(this.chainId, wallet)

      const signedTx = await wallet.ethSignTx(txToSign)

      if (!signedTx?.serialized) throw new Error('error signing tx')

      return signedTx.serialized
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signTransaction',
      })
    }
  }

  async signAndBroadcastTransaction({
    senderAddress,
    receiverAddress,
    signTxInput,
  }: SignAndBroadcastTransactionInput<T>): Promise<string> {
    try {
      const { txToSign, wallet } = signTxInput

      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      this.assertSupportsChain(wallet, txToSign.chainId)
      await this.assertSwitchChain(wallet)

      const txHash = await wallet.ethSendTx?.(txToSign)

      if (!txHash) throw new Error('error signing & broadcasting tx')

      return txHash.hash
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signAndBroadcastTransaction',
      })
    }
  }

  async broadcastTransaction({
    senderAddress,
    receiverAddress,
    hex,
  }: BroadcastTransactionInput): Promise<string> {
    try {
      await Promise.all([
        assertAddressNotSanctioned(senderAddress),
        receiverAddress !== CONTRACT_INTERACTION && assertAddressNotSanctioned(receiverAddress),
      ])

      const txHash = await this.providers.http.sendTx({ sendTxBody: { hex } })

      return txHash
    } catch (err) {
      if ((err as Error).name === 'ResponseError') {
        const response = await ((err as any).response as Response).json()
        const error = JSON.parse(response.message)

        return ErrorHandler(JSON.stringify(response), {
          translation: 'chainAdapters.errors.broadcastTransactionWithMessage',
          options: { message: error.message },
        })
      }

      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  async signMessage(signMessageInput: SignMessageInput<ETHSignMessage>): Promise<string> {
    try {
      const { messageToSign, wallet } = signMessageInput

      this.assertSupportsChain(wallet)
      await this.assertSwitchChain(wallet)
      await verifyLedgerAppOpen(this.chainId, wallet)

      const signedMessage = await wallet.ethSignMessage(messageToSign)

      if (!signedMessage) throw new Error('error signing message')

      return signedMessage.signature
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signMessage',
      })
    }
  }

  async signTypedData(input: SignTypedDataInput<ETHSignTypedData>): Promise<string> {
    try {
      const { typedDataToSign, wallet } = input

      this.assertSupportsChain(wallet)

      if (!wallet.ethSignTypedData) throw new Error('wallet does not support signing typed data')

      await this.assertSwitchChain(wallet)
      await verifyLedgerAppOpen(this.chainId, wallet)

      const result = await wallet.ethSignTypedData(typedDataToSign)

      if (!result) throw new Error('error signing typed data')

      return result.signature
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.signMessage',
      })
    }
  }

  async getAddress(input: GetAddressInput): Promise<string> {
    try {
      const { accountNumber, wallet, showOnDevice = false } = input

      if (input.pubKey) return input.pubKey

      this.assertSupportsChain(wallet)
      await verifyLedgerAppOpen(this.chainId, wallet)

      const bip44Params = this.getBip44Params({ accountNumber })
      const address = await wallet.ethGetAddress({
        addressNList: toAddressNList(bip44Params),
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

  // eslint-disable-next-line require-await
  async validateAddress(address: string): Promise<ValidAddressResult> {
    const isValidAddress = isAddress(address)
    if (isValidAddress) return { valid: true, result: ValidAddressResultType.Valid }
    return { valid: false, result: ValidAddressResultType.Invalid }
  }

  async subscribeTxs(
    input: SubscribeTxsInput,
    onMessage: (msg: Transaction) => void,
    onError: (err: SubscribeError) => void,
  ): Promise<void> {
    const { pubKey, accountNumber, wallet } = input

    const address = await this.getAddress({ accountNumber, wallet, pubKey })
    const bip44Params = this.getBip44Params({ accountNumber })
    const subscriptionId = toRootDerivationPath(bip44Params)

    await this.providers.ws.subscribeTxs(
      subscriptionId,
      { topic: 'txs', addresses: [address] },
      async msg => onMessage(await this.parseTx(msg.data, msg.address)),
      err => onError({ message: err.message }),
    )
  }

  unsubscribeTxs(input?: SubscribeTxsInput): void {
    if (!input) return this.providers.ws.unsubscribeTxs()

    const { accountNumber } = input
    const bip44Params = this.getBip44Params({ accountNumber })
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

      const fees: NetworkFees =
        maxFeePerGas && maxPriorityFeePerGas
          ? {
              maxFeePerGas: toHex(BigInt(maxFeePerGas)),
              maxPriorityFeePerGas: toHex(BigInt(maxPriorityFeePerGas)),
            }
          : { gasPrice: toHex(gasPrice ? BigInt(gasPrice) : 0n) }

      const bip44Params = this.getBip44Params({ accountNumber })
      const txToSign = {
        addressNList: toAddressNList(bip44Params),
        value: toHex(BigInt(value)),
        to,
        chainId: Number(fromChainId(this.chainId).chainReference),
        data,
        nonce: toHex(BigInt(account.chainSpecific.nonce)),
        gasLimit: toHex(BigInt(gasLimit)),
        ...fees,
      } as SignTx<T>

      return txToSign
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async buildCustomTx(input: BuildCustomTxInput): Promise<{ txToSign: SignTx<T> }> {
    try {
      const { wallet, accountNumber } = input

      this.assertSupportsChain(wallet)

      const from = await this.getAddress({ accountNumber, wallet })
      const txToSign = await this.buildCustomApiTx({ ...input, from })

      return { txToSign }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.buildTransaction',
      })
    }
  }

  async getGasFeeData(): Promise<GasFeeDataEstimate> {
    try {
      const { fast, average, slow } = await this.providers.http.getGasFees()
      return { fast, average, slow }
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getGasFeeData',
      })
    }
  }

  async getFeeData(input: GetFeeDataInput<T>): Promise<FeeDataEstimate<T>> {
    try {
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
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.getFeeData',
      })
    }
  }

  private async parseTx(tx: unchained.evm.types.Tx, pubkey: string): Promise<Transaction> {
    const { address: _, ...parsedTx } = await this.parser.parse(tx, pubkey)

    return {
      ...parsedTx,
      pubkey,
      transfers: parsedTx.transfers.map(transfer => ({
        assetId: transfer.assetId,
        from: [transfer.from],
        to: [transfer.to],
        type: transfer.type,
        value: transfer.totalValue,
        id: transfer.id,
        token: transfer.token,
      })),
    }
  }

  get httpProvider(): unchained.evm.Api {
    return this.providers.http
  }

  get wsProvider(): unchained.ws.Client<unchained.evm.types.Tx> {
    return this.providers.ws
  }
}
