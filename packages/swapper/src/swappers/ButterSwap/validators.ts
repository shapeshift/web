import * as myzod from 'myzod'
import * as z from 'myzod'

import { makeSwapErrorRight, TradeQuoteError } from '../../../api'

export const SupportedChainListResponseValidator = myzod.object({
  errno: myzod.number(),
  message: myzod.string(),
  data: myzod.array(myzod.number()),
})

export type SupportedChainListResponse = myzod.Infer<typeof SupportedChainListResponseValidator>

export const FindTokenResponseValidator = myzod.object({
  errno: myzod.number(),
  message: myzod.string(),
  data: myzod.array(
    myzod.object({
      id: myzod.number(),
      chainId: myzod.number(),
      address: myzod.string(),
      blockchainNetwork: myzod.string(),
      coingeckoId: myzod.string(),
      decimals: myzod.number(),
      image: myzod.string(),
      name: myzod.string(),
      rank: myzod.number(),
      symbol: myzod.string(),
      tokenSecurity: myzod.null(),
      usdprice: myzod.number(),
      usedIniframe: myzod.number(),
    }),
  ),
})

export type FindTokenResponse = myzod.Infer<typeof FindTokenResponseValidator>

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

export type RouteResponse = myzod.Infer<typeof RouteResponseValidator>

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
        method: z.string().optional(),
        args: z.array(z.object({ type: z.string(), value: z.unknown() })).optional(),
      }),
    ),
  }),
  z.object({
    errno: z.number().withPredicate(n => n > 0),
    message: z.string(),
  }),
])

export type BuildTxResponse = myzod.Infer<typeof BuildTxResponseValidator>
