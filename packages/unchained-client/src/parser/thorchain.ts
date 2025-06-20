import type { Axios } from 'axios'
import axios from 'axios'

import type { BaseTxMetadata, StandardTx } from '../types'
import { Dex, TradeType } from '../types'

export type LiquidityType = 'Savers' | 'LP' | 'RUNEPool'
export type SwapType = 'Standard' | 'Streaming'

interface Liquidity {
  type: LiquidityType
}

export interface Swap {
  type: SwapType
}

interface Coin {
  amount: string
  asset: string
}

interface InOut {
  txID: string
  address: string
  coins: Coin[]
  height?: string
}

interface StreamingSwapMeta {
  count: string
  depositedCoin: Coin
  inCoin: Coin
  interval: string
  lastHeight: string
  outCoin: Coin
  quantity: string
}

interface Metadata {
  addLiquidity?: {
    liquidityUnits: string
  }
  refund?: {
    affiliateAddress: string
    affiliateFee: string
    memo: string
    networkFees: Coin[]
    reason: string
  }
  swap?: {
    affiliateAddress: string
    affiliateFee: string
    isStreamingSwap: boolean
    liquidityFee: string
    memo: string
    networkFees: Coin[]
    streamingSwapMeta?: StreamingSwapMeta
    swapSlip: string
    swapTarget: string
  }
  withdraw?: {
    asymmetry: string
    basisPoints: string
    impermanentLossProtection: string
    liquidityUnits: string
    memo: string
    networkFees: Coin[]
  }
}

interface Actions {
  date: string
  height: string
  in: InOut[]
  out: InOut[]
  metadata?: Metadata
  pools: string[]
  status: 'success' | 'pending'
  type: 'swap' | 'addLiquidity' | 'withdraw' | 'donate' | 'refund' | 'switch'
}

export interface ActionsResponse {
  actions: Actions[]
  count: string
  meta: {
    nextPageToken: string
    prevPageToken: string
  }
}

interface ExtraMetadata {
  method: string
  liquidity?: Liquidity
  swap?: Swap
}

export interface TxMetadata<T extends 'thorchain' | 'mayachain' = 'thorchain'>
  extends BaseTxMetadata {
  parser: T
  memo: string
  liquidity?: Liquidity
  swap?: Swap
}

interface ParsedTx<T extends 'thorchain' | 'mayachain'> extends StandardTx {
  data?: TxMetadata<T>
}

type TxSpecific<T extends 'thorchain' | 'mayachain'> = Partial<
  Pick<ParsedTx<T>, 'data' | 'trade' | 'transfers'>
>

export interface ParserArgs {
  midgardUrl: string
}

const streamingSwapRegex = /:(\d+|(\d+(?:e[+-]?\d+)?))\/\d+\/\d+:/

const getLiquidityType = (pool: string): LiquidityType => (pool.includes('/') ? 'Savers' : 'LP')

const getSwapType = (memo: string): SwapType =>
  streamingSwapRegex.test(memo) ? 'Streaming' : 'Standard'

export class Parser<T extends 'thorchain' | 'mayachain' = 'thorchain'> {
  private readonly axiosMidgard: Axios

  protected dexName = Dex.Thor
  protected parserName: T = 'thorchain' as T

  constructor(args: ParserArgs) {
    this.axiosMidgard = axios.create({ baseURL: args.midgardUrl })
  }

  async parse(memo: string): Promise<TxSpecific<T> | undefined> {
    const [type] = memo.split(':')

    switch (type.toLowerCase()) {
      case 'swap':
      case '=':
      case 's': {
        return {
          data: {
            parser: this.parserName,
            method: 'swap',
            memo,
            swap: { type: getSwapType(memo) },
          },
          trade: { dexName: this.dexName, type: TradeType.Swap, memo },
        }
      }
      case 'add':
      case '+': {
        const [, pool] = memo.split(':')
        const type = getLiquidityType(pool)
        return { data: { parser: this.parserName, method: 'deposit', memo, liquidity: { type } } }
      }
      case 'pool+': {
        const type = 'RUNEPool'
        return { data: { parser: this.parserName, method: 'deposit', memo, liquidity: { type } } }
      }
      case 'withdraw':
      case '-':
      case 'wd': {
        const [, pool] = memo.split(':')
        const type = getLiquidityType(pool)
        return { data: { parser: this.parserName, method: 'withdraw', memo, liquidity: { type } } }
      }
      case 'pool-': {
        const type = 'RUNEPool'
        return {
          data: { parser: this.parserName, method: 'withdrawNative', memo, liquidity: { type } },
        }
      }
      case '$+':
      case 'loan+':
        return { data: { parser: this.parserName, memo, method: 'loanOpen' } }
      case '$-':
      case 'loan-':
        return { data: { parser: this.parserName, memo, method: 'loanRepayment' } }
      case 'tcy':
        return { data: { parser: this.parserName, memo, method: 'claim' } }
      case 'tcy+':
        return { data: { parser: this.parserName, memo, method: 'stake' } }
      case 'tcy-':
        return { data: { parser: this.parserName, memo, method: 'unstake' } }
      case 'out': {
        const extraMetadata = await this.getExtraMetadata(memo)
        if (!extraMetadata) return
        return { data: { parser: this.parserName, memo, ...extraMetadata } }
      }
      case 'refund':
        const extraMetadata = await this.getExtraMetadata(memo)
        if (!extraMetadata) return
        return { data: { parser: this.parserName, memo, ...extraMetadata } }
      default:
        return
    }
  }

  private getExtraMetadata = async (memo: string): Promise<ExtraMetadata | undefined> => {
    const [type, txid] = memo.split(':')
    const { data } = await this.axiosMidgard.get<ActionsResponse>(`/actions?txid=${txid}`)

    const action = data.actions[data.actions.length - 1]

    if (!action) return

    const swapMemo = action.metadata?.swap?.memo ?? ''
    const [swapType] = swapMemo.split(':')

    const refundMemo = action.metadata?.refund?.memo ?? ''
    const [refundType] = refundMemo.split(':')

    const txType = (() => {
      if (swapType) {
        switch (swapType.toLowerCase()) {
          case '$+':
          case 'loan+':
            return 'loanOpen'
          case '$-':
          case 'loan-':
            return 'loanRepayment'
          default:
            return action.type
        }
      }

      if (refundType) {
        switch (refundType.toLowerCase()) {
          case 'swap':
          case '=':
          case 's':
            return 'swap'
          case '$+':
          case 'loan+':
            return 'loanOpen'
          case '$-':
          case 'loan-':
            return 'loanRepayment'
          case 'add':
          case '+':
            return 'deposit'
          case 'withdraw':
          case '-':
          case 'wd':
            return 'withdraw'
          default:
            return action.type
        }
      }

      return action.type
    })()

    const method = (() => {
      switch (type.toLowerCase()) {
        case 'out': {
          return txType ? `${txType}Out` : 'out'
        }
        case 'refund': {
          return txType ? `${txType}Refund` : 'refund'
        }
        default:
          return 'unknown'
      }
    })()

    const liquidity = (() => {
      if (type.toLowerCase() === 'refund' && ['withdraw', 'deposit'].includes(txType))
        return { type: getLiquidityType(refundMemo.split(':')[1]) }
      if (txType === 'withdraw') return { type: getLiquidityType(action.pools[0]) }
    })()

    const swap = txType === 'swap' ? { type: getSwapType(swapMemo || refundMemo) } : undefined

    return { method, liquidity, swap }
  }
}
