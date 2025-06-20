import type { Infer } from 'myzod'
import * as z from 'myzod'

import { makeSwapErrorRight, TradeQuoteError } from '../../../api'

export const SupportedChainListResponseValidator = z.object({
  errno: z.number(),
  message: z.string(),
  data: z.array(z.number()),
})

export type SupportedChainListResponse = Infer<typeof SupportedChainListResponseValidator>

export const FindTokenResponseValidator = z.object({
  errno: z.number(),
  message: z.string(),
  data: z.array(
    z.object({
      id: z.number(),
      chainId: z.number(),
      address: z.string(),
      blockchainNetwork: z.string(),
      coingeckoId: z.string(),
      decimals: z.number(),
      image: z.string(),
      name: z.string(),
      rank: z.number(),
      symbol: z.string(),
      tokenSecurity: z.null(),
      usdprice: z.number(),
      usedIniframe: z.number(),
    }),
  ),
})

export type FindTokenResponse = Infer<typeof FindTokenResponseValidator>

export const RouteResponseValidator = z.union([
  z.object({
    errno: z.literal(0),
    message: z.literal('success'),
    data: z.array(
      z.object({
        diff: z.string(),
        bridgeFee: z.object({
          amount: z.string(),
          symbol: z.string(),
        }),
        tradeType: z.number(),
        gasFee: z.object({
          amount: z.string(),
          symbol: z.string(),
        }),
        gasEstimated: z.string(),
        timeEstimated: z.number(),
        hash: z.string(),
        timestamp: z.number(),
        srcChain: z.object({}, { allowUnknown: true }),
        bridgeChain: z.object({}, { allowUnknown: true }),
        dstChain: z.object({}, { allowUnknown: true }),
      }),
    ),
  }),
  z.object({
    errno: z.number().withPredicate(n => n > 0),
    message: z.string(),
    maxAmount: z.string().optional(),
  }),
])

export type RouteResponse = Infer<typeof RouteResponseValidator>

export const BuildTxResponseValidator = z.union([
  z.object({
    errno: z.literal(0),
    message: z.literal('success'),
    data: z.array(
      z.object({
        to: z.string(),
        data: z.string(),
        value: z.string(),
        chainId: z.string(),
        method: z.string(),
        args: z.array(z.object({ type: z.string(), value: z.unknown() })),
      }),
    ),
  }),
  z.object({
    errno: z.number().withPredicate(n => n > 0),
    message: z.string(),
  }),
])

export type BuildTxResponse = Infer<typeof BuildTxResponseValidator>
