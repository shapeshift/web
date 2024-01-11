import type { Axios } from 'axios'
import axios from 'axios'

import { type BaseTxMetadata, Dex, TradeType } from '../../types'
import type { SubParser, Tx, TxSpecific } from '../parser'

export type LiquidityType = 'Savers' | 'LP'
export type SwapType = 'Standard' | 'Streaming'

interface Liquidity {
  type: LiquidityType
}

interface Swap {
  type: SwapType
}

export interface TxMetadata extends BaseTxMetadata {
  parser: 'thorchain'
  memo: string
  liquidity?: Liquidity
  swap?: Swap
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
    networkFees: Coin[]
    swapSlip: string
    swapTarget: string
    memo: string
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

const getLiquidityType = (pool: string): LiquidityType => (pool.includes('/') ? 'Savers' : 'LP')

const getSwapType = (memo: string): SwapType => {
  const regex = /:\d+\/\d+\/\d+:/
  return regex.test(memo) ? 'Streaming' : 'Standard'
}

export interface ParserArgs {
  midgardUrl: string
}

export class Parser implements SubParser<Tx> {
  private readonly axiosMidgard: Axios

  constructor(args: ParserArgs) {
    this.axiosMidgard = axios.create({ baseURL: args.midgardUrl })
  }

  async parse(tx: Tx): Promise<TxSpecific | undefined> {
    const opReturn = tx.vout.find(vout => vout.opReturn)?.opReturn
    if (!opReturn) return

    const regex = /OP_RETURN \(([^)]+)\)/

    const [, memo] = opReturn.match(regex) ?? [undefined, undefined]

    if (!memo) return

    const [type] = memo.split(':')

    switch (type.toLowerCase()) {
      case 'swap':
      case '=':
      case 's': {
        return await Promise.resolve({
          data: { parser: 'thorchain', memo, swap: { type: getSwapType(memo) } },
          trade: { dexName: Dex.Thor, type: TradeType.Swap, memo },
        })
      }
      case 'add':
      case '+': {
        const [, pool] = memo.split(':')
        const type = getLiquidityType(pool)
        return await Promise.resolve({
          data: { parser: 'thorchain', method: 'deposit', memo, liquidity: { type } },
        })
      }
      case 'withdraw':
      case '-':
      case 'wd': {
        const [, pool] = memo.split(':')
        const type = getLiquidityType(pool)
        return await Promise.resolve({
          data: { parser: 'thorchain', method: 'withdraw', memo, liquidity: { type } },
        })
      }
      case '$+':
      case 'loan+':
        return await Promise.resolve({
          data: { parser: 'thorchain', memo, method: 'loanOpen' },
        })
      case '$-':
      case 'loan-':
        return await Promise.resolve({
          data: { parser: 'thorchain', memo, method: 'loanRepayment' },
        })
      case 'out': {
        const extraMetadata = await this.getExtraMetadata(memo)
        return await Promise.resolve({
          data: { parser: 'thorchain', memo, ...extraMetadata },
        })
      }
      case 'refund':
        const extraMetadata = await this.getExtraMetadata(memo)
        return await Promise.resolve({
          data: { parser: 'thorchain', memo, ...extraMetadata },
        })
      default:
        return
    }
  }

  private getExtraMetadata = async (memo: string): Promise<ExtraMetadata> => {
    const [type, txid] = memo.split(':')
    const { data } = await this.axiosMidgard.get<ActionsResponse>(`/actions?txid=${txid}`)

    const action = data.actions[data.actions.length - 1]

    const swapMemo = action.metadata?.swap?.memo ?? ''
    const [swapType] = swapMemo.split(':')

    const refundMemo = action.metadata?.refund?.memo ?? ''
    const [refundType] = refundMemo.split(':')

    const txType = (() => {
      if (swapType) {
        switch (swapType) {
          case '$-':
          case 'loan-':
            return 'loan'
          default:
            return action.type
        }
      }

      if (refundType) {
        switch (refundType) {
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
      if (txType === 'withdraw') return { type: getLiquidityType(action.pools[0]) }
      if (type.toLowerCase() === 'refund' && txType === 'deposit')
        return { type: getLiquidityType(refundMemo.split(':')[1]) }
    })()

    const swap = txType === 'swap' ? { type: getSwapType(swapMemo || refundMemo) } : undefined

    return { method, liquidity, swap }
  }
}
