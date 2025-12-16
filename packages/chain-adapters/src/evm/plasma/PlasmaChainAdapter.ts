import type { AssetId } from '@shapeshiftoss/caip'
import { ASSET_REFERENCE, plasmaAssetId } from '@shapeshiftoss/caip'
import { MULTICALL3_CONTRACT } from '@shapeshiftoss/contracts'
import type { RootBip44Params } from '@shapeshiftoss/types'
import { KnownChainIds } from '@shapeshiftoss/types'
import { Contract, Interface, JsonRpcProvider } from 'ethers'
import PQueue from 'p-queue'
import { multicall3Abi } from 'viem'

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

const SUPPORTED_CHAIN_IDS = [KnownChainIds.PlasmaMainnet]
const DEFAULT_CHAIN_ID = KnownChainIds.PlasmaMainnet

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)']

const BATCH_SIZE = 500 // Process 500 tokens per multicall to avoid gas/RPC limits

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

export const isPlasmaChainAdapter = (adapter: unknown): adapter is ChainAdapter => {
  return (adapter as ChainAdapter).getType() === KnownChainIds.PlasmaMainnet
}

export class ChainAdapter extends EvmBaseAdapter<KnownChainIds.PlasmaMainnet> {
  public static readonly rootBip44Params: RootBip44Params = {
    purpose: 44,
    coinType: Number(ASSET_REFERENCE.Plasma),
    accountNumber: 0,
  }

  protected provider: JsonRpcProvider
  protected multicall: Contract
  protected erc20Interface: Interface
  protected knownTokens: TokenInfo[]
  private requestQueue: PQueue

  constructor(args: ChainAdapterArgs) {
    const dummyParser = {
      parse: () => {
        throw new Error('Transaction parsing is not supported for Plasma')
      },
    } as any

    super({
      assetId: plasmaAssetId,
      chainId: DEFAULT_CHAIN_ID,
      rootBip44Params: ChainAdapter.rootBip44Params,
      parser: dummyParser,
      supportedChainIds: SUPPORTED_CHAIN_IDS,
      providers: {} as any,
      rpcUrl: args.rpcUrl,
    })

    this.provider = new JsonRpcProvider(args.rpcUrl, undefined, {
      staticNetwork: true,
    })

    this.multicall = new Contract(MULTICALL3_CONTRACT, multicall3Abi, this.provider)
    this.erc20Interface = new Interface(ERC20_ABI)
    this.knownTokens = args.knownTokens ?? []
    this.requestQueue = new PQueue({
      intervalCap: 1,
      interval: 50,
      concurrency: 1,
    })
  }

  getDisplayName() {
    return ChainAdapterDisplayName.Plasma
  }

  getName() {
    return 'Plasma'
  }

  getType(): KnownChainIds.PlasmaMainnet {
    return KnownChainIds.PlasmaMainnet
  }

  getFeeAssetId(): AssetId {
    return this.assetId
  }

  async getAccount(pubkey: string): Promise<Account<KnownChainIds.PlasmaMainnet>> {
    try {
      const [balance, nonce] = await Promise.all([
        this.requestQueue.add(() => this.provider.getBalance(pubkey)),
        this.requestQueue.add(() => this.provider.getTransactionCount(pubkey)),
      ])

      const knownTokens = await this.getKnownPlasmaTokens()

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

  private getKnownPlasmaTokens(): Promise<TokenInfo[]> {
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

      for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
        const batch = tokens.slice(i, i + BATCH_SIZE)
        const batchResults = await this.multicallBatch(pubkey, batch)
        results.push(...batchResults)
      }

      return results
    } catch (error) {
      console.warn('[Plasma] Multicall failed, falling back to individual calls:', error)
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
    const calls = tokens.map(token => ({
      target: token.contractAddress,
      allowFailure: true,
      callData: this.erc20Interface.encodeFunctionData('balanceOf', [pubkey]),
    }))

    const results = await this.requestQueue.add(() => this.multicall.aggregate3(calls))

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

          const balance = await this.requestQueue.add(() => contract.balanceOf(pubkey))

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
      const feeData = await this.requestQueue.add(() => this.provider.getFeeData())

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
    input: GetFeeDataInput<KnownChainIds.PlasmaMainnet>,
  ): Promise<FeeDataEstimate<KnownChainIds.PlasmaMainnet>> {
    try {
      const estimateGasBody = this.buildEstimateGasBody(input)

      const gasLimit = await this.requestQueue.add(() =>
        this.provider.estimateGas({
          from: estimateGasBody.from,
          to: estimateGasBody.to,
          value: estimateGasBody.value ? BigInt(estimateGasBody.value) : undefined,
          data: estimateGasBody.data,
        }),
      )

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

      const txResponse = await this.requestQueue.add(() => this.provider.broadcastTransaction(hex))
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
    return Promise.reject(new Error('Transaction parsing is not supported for Plasma'))
  }
}
