import type { Infer } from 'myzod'
import * as z from 'myzod'

const ErrorValidator = z.object({
  errno: z.number().withPredicate(n => n > 0),
  message: z.string(),
  maxAmount: z.string().optional(),
})

const TokenValidator = z.object({
  address: z.string(),
  name: z.string(),
  decimals: z.number(),
  symbol: z.string(),
  icon: z.string(),
})

const RouteSuccessItemValidator = z.object({
  diff: z.string(),
  bridgeFee: z.object({
    amount: z.string(),
    affiliate: z.object({
      amount: z.string(),
      list: z.array(z.unknown()),
      data: z.string(),
    }),
  }),
  tradeType: z.number(),
  gasFee: z.object({
    amount: z.string(),
    symbol: z.string(),
    inUSD: z.string(),
  }),
  swapFee: z.object({
    nativeFee: z.string(),
    tokenFee: z.string(),
  }),
  feeConfig: z.object({
    feeType: z.number(),
    referrer: z.string(),
    rateOrNativeFee: z.number(),
  }),
  gasEstimated: z.string(),
  gasEstimatedTarget: z.string(),
  timeEstimated: z.number(),
  hash: z.string(),
  entrance: z.string(),
  timestamp: z.number(),
  hasLiquidity: z.boolean(),
  srcChain: z.object({
    chainId: z.string(),
    tokenIn: TokenValidator,
    tokenOut: TokenValidator,
    totalAmountIn: z.string(),
    totalAmountOut: z.string(),
    totalAmountOutUSD: z.string(),
    route: z.array(
      z.object({
        amountIn: z.string(),
        amountOut: z.string(),
        dexName: z.string(),
        path: z.array(z.unknown()),
        extra: z.string(),
      }),
    ),
    bridge: z.string(),
  }),
  totalAmountInUSD: z.string(),
  totalAmountOutUSD: z.string(),
  contract: z.string(),
  minAmountOut: z.object({
    amount: z.string(),
    symbol: z.string(),
  }),
})

const BuildTxSuccessItemValidator = z.object({
  to: z.string(),
  data: z.string(),
  value: z.string(),
  chainId: z.string(),
  method: z.string(),
  args: z.array(z.object({ type: z.string(), value: z.unknown() })),
})

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
    data: z.array(RouteSuccessItemValidator),
  }),
  ErrorValidator,
])

export type RouteResponse = Infer<typeof RouteResponseValidator>

const BuildTxSuccessResponseValidator = z.object({
  errno: z.literal(0),
  message: z.literal('success'),
  data: z.array(BuildTxSuccessItemValidator),
})

export const BuildTxResponseValidator = z.union([BuildTxSuccessResponseValidator, ErrorValidator])

export type BuildTxResponse = Infer<typeof BuildTxResponseValidator>

const TxParamValidator = z.object({
  errno: z.number(),
  message: z.string(),
  data: z.array(BuildTxSuccessItemValidator),
})

const RouteAndSwapSuccessItemValidator = z.object({
  route: RouteSuccessItemValidator,
  txParam: TxParamValidator,
})

export const RouteAndSwapResponseValidator = z.union([
  z.object({
    errno: z.literal(0),
    message: z.literal('success'),
    data: z.array(RouteAndSwapSuccessItemValidator),
  }),
  ErrorValidator,
])

export type RouteAndSwapResponse = Infer<typeof RouteAndSwapResponseValidator>
