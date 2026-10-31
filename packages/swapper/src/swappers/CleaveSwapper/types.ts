import type { Address, Hex } from 'viem'

import type { GetEvmTradeQuoteInput, GetEvmTradeRateInput } from '../../types'

export type CleaveTradeQuoteInput = GetEvmTradeQuoteInput
export type CleaveTradeRateInput = GetEvmTradeRateInput

export type CleaveTransaction = {
  to: Address
  data: Hex
  value: string
}

export type CleaveExecution = {
  target: Address
  approval: { token: Address; spender: Address; amount: string } | null
}

export type CleaveNotice = {
  code: string
  level: 'blocking' | 'warning' | 'info'
  title: string
  text: string
}

export type CleaveSwapQuote = {
  status: 'ok'
  kind: string
  amountIn: string
  amountOutGross: string
  amountOutNet: string
  minOut: string | null
  fees: { referral: { bps: number; amount: string } }
  partial?: { refusedAtSource: string } | null
  remainders?: { token: string }[]
  route?: { legs: { venueName: string }[] } | null
  preferredExecution: 'classic' | 'measured'
  execution: CleaveExecution | null
  tx: CleaveTransaction | null
  notices?: (CleaveNotice | null)[]
}

export type CleaveExecutableQuote = CleaveSwapQuote & {
  tx: CleaveTransaction
  execution: CleaveExecution
}

export type CleaveQuoteResponse = CleaveSwapQuote | { status: 'no_route'; reason?: string }

export type CleaveErrorResponse = {
  error: { code: string; reason?: string; message: string }
}
