import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, monadAssetId } from '@shapeshiftoss/caip'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
// @ts-ignore fml that'll do for now
import { Contract, Interface, JsonRpcProvider } from 'ethers'

import { ErrorHandler } from '../../error/ErrorHandler'
import type {
  Account,
  BroadcastTransactionInput,
  FeeDataEstimate,
  GetFeeDataInput,
  SubscribeError,
  SubscribeTxsInput,
  Transaction,
  TxHistoryInput,
  TxHistoryResponse,
} from '../../types'
import { ChainAdapterDisplayName, CONTRACT_INTERACTION } from '../../types'
import { bnOrZero } from '../../utils/bignumber'
import { assertAddressNotSanctioned } from '../../utils/validateAddress'
import { EvmBaseAdapter } from '../EvmBaseAdapter'
import type { GasFeeDataEstimate } from '../types'

const SUPPORTED_CHAIN_IDS = [KnownChainIds.MonadMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.MonadMainnet

// Multicall3 contract on Monad
const MULTICALL3_ADDRESS = '0xd1b797d92d87b688193a2b976efc8d577d204343'

const MULTICALL3_ABI = [
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) returns (tuple(bool success, bytes returnData)[])',
]

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)']

const BATCH_SIZE = 500 // Process 500 tokens per multicall

export type TokenInfo = {
  assetId: AssetId
  contractAddress: string
  symbol: string
  name: string
  precision: number
}

export type ChainAdapterArgs = {
  rpcUrl: string
  knownTokens?: TokenInfo[]
}

export const isMonadChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.MonadMainnet
}

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.MonadMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Monad),
    accountNumber: 0,
  }

  protected provider: JsonRpcProvider
  protected multicall: Contract
  protected erc20Interface: Interface
  protected knownTokens: TokenInfo[]

  constructor(args: ChainAdapterArgs) {
    // Create a dummy parser - we won't use it since we don't support tx history
    const dummyParser = {
      parse: () => {
        throw new Error('Transaction parsing is not supported for Monad')
      },
    } as any

    super({
      assetId: monadAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      parser: dummyParser,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      providers: {} as any, // We don't use unchained providers
      rpcUrl: args.rpcUrl,
    })

    this.provider = new JsonRpcProvider(args.rpcUrl, undefined, {
      staticNetwork: true,
    })

    this.multicall = new Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, this.provider)
    this.erc20Interface = new Interface(ERC20_ABI)
    this.knownTokens = args.knownTokens ?? []
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Monad
  }

  getName() {
    return 'Monad'
  }

  getType(): KnownChainIds.MonadMainnet {
    return KnownChainIds.MonadMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.MonadMainnet>> {
    try {
      const [balance, nonce] = await Promise.all([
        this.provider.getBalance(pubkey),
        this.provider.getTransactionCount(pubkey),
      ])

      // Get known tokens from asset service for Monad
      const knownTokens = await this.getKnownMonadTokens()

      let tokens: {
        assetId: AssetId
        balance: string
        symbol: string
        name: string
        precision: number
      }[] = []

      if (knownTokens.length > 0) {
        tokens = await this.getTokenBalancesMulticall(pubkey, knownTokens)
      }

      return {
        balance: balance.toString(),
        chainId: this.chainId,
        assetId: this.assetId,
        chain: this.getType(),
        chainSpecific: {
          nonce,
          tokens: tokens.filter(t => t.balance !== '0'),
        },
        pubkey,
      }
    } catch (err) {
      throw new Error(`Failed to get account: ${err}`)
    }
  }

  private getKnownMonadTokens(): Promise<TokenInfo[]> {
    // Returns the list of known Monad tokens passed in the constructor
    // These are fetched from the asset service by the plugin
    return Promise.resolve(this.knownTokens)
  }

  private async getTokenBalancesMulticall(
    pubkey: string,
    tokens: TokenInfo[],
  ): Promise<
    {
      assetId: AssetId
      balance: string
      symbol: string
      name: string
      precision: number
    }[]
  > {
    try {
      const results: {
        assetId: AssetId
        balance: string
        symbol: string
        name: string
        precision: number
      }[] = []

      // Process tokens in batches to avoid RPC limits
      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE)
        const batchResults = await this.multicallBatch(pubkey, batch)
        results.push(...batchResults)
      }

      return results
    } catch (error) {
      console.warn('[Monad] Multicall failed, falling back to individual calls:', error)
      // Fallback to individual calls if multicall fails
      return this.getTokenBalancesIndividual(pubkey, tokens)
    }
  }

  private async multicallBatch(
    pubkey: string,
    tokens: TokenInfo[],
  ): Promise<
    {
      assetId: AssetId
      balance: string
      symbol: string
      name: string
      precision: number
    }[]
  > {
    // Build multicall calls array
    const calls = tokens.map(token => ({
      target: token.contractAddress,
      allowFailure: true, // Don't revert entire batch if one token fails
      callData: this.erc20Interface.encodeFunctionData('balanceOf', [pubkey]),
    }))

    // Execute multicall
    const results = await this.multicall.aggregate3(calls)

    // Decode results
    return tokens
      .map((token, i) => {
        const { success, returnData } = results[i]

        if (!success || returnData === '0x') {
          return null
        }

        try {
          const [balance] = this.erc20Interface.decodeFunctionResult('balanceOf', returnData)

          return {
            assetId: token.assetId,
            balance: balance.toString(),
            symbol: token.symbol,
            name: token.name,
            precision: token.precision,
          }
        } catch {
          return null
        }
      })
      .filter((result): result is NonNullable<typeof result> => result !== null)
  }

  private async getTokenBalancesIndividual(
    pubkey: string,
    tokens: TokenInfo[],
  ): Promise<
    {
      assetId: AssetId
      balance: string
      symbol: string
      name: string
      precision: number
    }[]
  > {
    const results = await Promise.all(
      tokens.map(async token => {
        try {
          const contract = new Contract(token.contractAddress, ERC20_ABI, this.provider)

          const balance = await contract.balanceOf(pubkey)

          return {
            assetId: token.assetId,
            balance: balance.toString(),
            symbol: token.symbol,
            name: token.name,
            precision: token.precision,
          }
        } catch {
          return null
        }
      }),
    )

    return results.filter((result): result is NonNullable<typeof result> => result !== null)
  }

  async getGasFeeData(): Promise<GasFeeDataEstimate> {
    try {
      const feeData = await this.provider.getFeeData()

      const gasPrice = feeData.gasPrice?.toString() ?? '0'
      const maxFeePerGas = feeData.maxFeePerGas?.toString()
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas?.toString()

      const fees = {
        gasPrice,
        ...(maxFeePerGas && maxPriorityFeePerGas ? { maxFeePerGas, maxPriorityFeePerGas } : {}),
      }

      return {
        fast: fees,
        average: fees,
        slow: fees,
      }
    } catch (err) {
      throw new Error(`Failed to get gas fee data: ${err}`)
    }
  }

  async getFeeData(
    input: GetFeeDataInput<KnownChainIds.MonadMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.MonadMainnet>> {
    try {
      const estimateGasBody = this.buildEstimateGasBody(input)

      const gasLimit = await this.provider.estimateGas({
        from: estimateGasBody.from,
        to: estimateGasBody.to,
        value: estimateGasBody.value ? BigInt(estimateGasBody.value) : undefined,
        data: estimateGasBody.data,
      })

      const { fast, average, slow } = await this.getGasFeeData()

      const gasLimitString = gasLimit.toString()

      return {
        fast: {
          txFee: bnOrZero(fast.maxFeePerGas ?? fast.gasPrice)
            .times(gasLimitString)
            .toFixed(0),
          chainSpecific: { gasLimit: gasLimitString, ...fast },
        },
        average: {
          txFee: bnOrZero(average.maxFeePerGas ?? average.gasPrice)
            .times(gasLimitString)
            .toFixed(0),
          chainSpecific: { gasLimit: gasLimitString, ...average },
        },
        slow: {
          txFee: bnOrZero(slow.maxFeePerGas ?? slow.gasPrice)
            .times(gasLimitString)
            .toFixed(0),
          chainSpecific: { gasLimit: gasLimitString, ...slow },
        },
      }
    } catch (err) {
      throw new Error(`Failed to get fee data: ${err}`)
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

      const txResponse = await this.provider.broadcastTransaction(hex)
      return txResponse.hash
    } catch (err) {
      return ErrorHandler(err, {
        translation: 'chainAdapters.errors.broadcastTransaction',
      })
    }
  }

  unsubscribeTxs(_input?: SubscribeTxsInput): void {
    return
  }

  subscribeTxs(
    _input: SubscribeTxsInput,
    _onMessage: (msg: Transaction) => void,
    _onError: (err: SubscribeError) => void,
  ): Promise<void> {
    return Promise.resolve()
  }

  getTxHistory(_input: TxHistoryInput): Promise<TxHistoryResponse> {
    return Promise.resolve({
      cursor: '',
      pubkey: _input.pubkey,
      transactions: [],
      txIds: [],
    })
  }

  parseTx(_tx: unknown, _pubkey: string): Promise<Transaction> {
    return Promise.reject(new Error('Transaction parsing is not supported for Monad'))
  }
}
