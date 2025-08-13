import type { Axios } from 'axios'
import axios from 'axios'

import type { BaseTxMetadata, Dex, StandardTx } from '../types'
import { TradeType } from '../types'

type LiquidityType = 'Savers' | 'LP' | 'RUNEPool'
type SwapType = 'Standard' | 'Streaming'

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
  type: 'swap' | 'addLiquidity' | 'withdraw' | 'refund' | 'send'
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
  originMemo?: string
}

type DexName = Dex.Thor | Dex.Maya
type ParserName = 'thorchain' | 'mayachain'

export interface TxMetadata extends BaseTxMetadata {
  parser: ParserName
  memo: string
  liquidity?: Liquidity
  swap?: Swap
  originMemo?: string
}

interface ParsedTx extends StandardTx {
  data?: TxMetadata
}

export type TxSpecific = Partial<Pick<ParsedTx, 'data' | 'trade' | 'transfers'>>

interface ParserArgs {
  dexName: DexName
  parserName: ParserName
  midgardUrl: string
}

const getLiquidityType = (pool: string): LiquidityType => (pool.includes('/') ? 'Savers' : 'LP')

const getSwapType = (memo: string): SwapType => {
  const streamingSwapRegex = /:(\d+|(\d+(?:e[+-]?\d+)?))\/\d+\/\d+:/
  return streamingSwapRegex.test(memo) ? 'Streaming' : 'Standard'
}

export const getAffiliateName = (memo: string): string => {
  const [action] = memo.split(':')

  switch (action.toLowerCase()) {
    case 'swap':
    case '=':
    case 's': {
      // SWAP:ASSET:DESTADDR:LIM/INTERVAL/QUANTITY:AFFILIATE:FEE
      const [, , , , affiliateName] = memo.split(':')
      return affiliateName
    }
    case 'add':
    case '+':
    case 'a': {
      // ADD:POOL:PAIRADDRESS:AFFILIATE:FEE
      const [, , , affilateName] = memo.split(':')
      return affilateName
    }
    case '$+':
    case 'loan+': {
      // LOAN+:ASSET:DESTADDR:MINOUT:AFFILIATE:FEE
      const [, , , , affiliateName] = memo.split(':')
      return affiliateName
    }
    case 'pool-': {
      // POOL-:BASISPOINTS:AFFILIATE:FEE
      const [, , affilateName] = memo.split(':')
      return affilateName
    }
    default:
      return ''
  }
}

// Common parser for Thorchain and Mayachain
export class Parser {
  protected readonly axiosMidgard: Axios

  dexName: Dex
  parserName: ParserName

  constructor(args: ParserArgs) {
    this.axiosMidgard = axios.create({ baseURL: args.midgardUrl })

    this.dexName = args.dexName
    this.parserName = args.parserName
  }

  protected async _parse(memo: string): Promise<TxSpecific | undefined> {
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
      case 'a':
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

    const originMemo =
      action.metadata?.swap?.memo ||
      action.metadata?.refund?.memo ||
      action.metadata?.withdraw?.memo

    return { method, liquidity, swap, originMemo }
  }
}
