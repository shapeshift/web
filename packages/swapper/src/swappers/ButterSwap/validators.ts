import type { Infer } from 'myzod'
import * as z from 'myzod'

// Generic error validator for non-zero errno
export const ErrorValidator = z.object({
  errno: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
})

const TokenValidator = z.object({
  address: z.string(),
  name: z.string(),
  decimals: z.number(),
  symbol: z.string(),
  icon: z.string(),
})

const RouteChainValidator = z.object({
  chainId: z.string(),
  tokenIn: TokenValidator,
  tokenOut: TokenValidator,
  totalAmountIn: z.string(),
  totalAmountOut: z.string(),
  totalAmountOutUSD: z.string().optional(),
  route: z.array(
    z.object({
      amountIn: z.string(),
      amountOut: z.string(),
      dexName: z.string(),
      path: z.array(z.unknown()),
      extra: z.string(),
    }),
  ),
  bridge: z.string().optional(),
})

const AffiliateValidator = z.object({
  amount: z.string(),
  list: z.array(z.unknown()),
  data: z.string(),
})

export const BridgeFeeValidator = z.object({
  amount: z.string(),
  affiliate: AffiliateValidator,
  symbol: z.string().optional(),
  address: z.string().optional(),
  chainId: z.number().optional(),
  in: z.number().optional(),
  out: z.number().optional(),
})

export const RouteSuccessItemValidator = z.object({
  diff: z.string(),
  bridgeFee: BridgeFeeValidator,
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
  srcChain: RouteChainValidator,
  bridgeChain: RouteChainValidator.optional(),
  dstChain: RouteChainValidator.optional(),
  totalAmountInUSD: z.string().optional(),
  totalAmountOutUSD: z.string().optional(),
  contract: z.string().optional(),
  minAmountOut: z
    .object({
      amount: z.string(),
      symbol: z.string(),
    })
    .optional(),
  bridge: z.string().optional(),
})

const RouteSuccessResponseValidator = z.object({
  errno: z.literal(0),
  message: z.string(),
  data: z.array(RouteSuccessItemValidator),
})

export const RouteResponseValidator = z.union([RouteSuccessResponseValidator, ErrorValidator])

export type RouteResponse = Infer<typeof RouteResponseValidator>

const BuildTxSuccessItemValidator = z.object({
  to: z.string(),
  data: z.string(),
  value: z.string(),
  chainId: z.string(),
  method: z.string().optional(),
  args: z.array(z.object({ type: z.string(), value: z.unknown() })).optional(),
})

const BuildTxSuccessResponseValidator = z.object({
  errno: z.literal(0),
  message: z.string(),
  data: z.array(BuildTxSuccessItemValidator),
})

export const BuildTxResponseValidator = z.union([BuildTxSuccessResponseValidator, ErrorValidator])

export type BuildTxResponse = Infer<typeof BuildTxResponseValidator>

const TxParamArgValidator = z.object({
  type: z.string(),
  value: z.string(),
})

const TxParamDataValidator = z.object({
  to: z.string(),
  data: z.string(),
  value: z.string(),
  chainId: z.string(),
  method: z.string(),
  args: z.array(TxParamArgValidator),
})

const TxParamValidator = z.object({
  errno: z.number(),
  message: z.string(),
  data: z.array(TxParamDataValidator),
})

const RouteAndSwapDataValidator = z.object({
  route: RouteSuccessItemValidator,
  txParam: TxParamValidator,
})

const RouteAndSwapSuccessResponseValidator = z.object({
  errno: z.literal(0),
  message: z.string(),
  data: z.array(RouteAndSwapDataValidator),
})

export const RouteAndSwapResponseValidator = z.union([
  RouteAndSwapSuccessResponseValidator,
  ErrorValidator,
])

export type RouteAndSwapResponse = Infer<typeof RouteAndSwapResponseValidator>

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

export const BridgeInfoValidator = z.object({
  fromHash: z.string(),
  toHash: z.string().optional(),
  state: z.number(),
  fromChainId: z.number(),
  toChainId: z.number(),
  fromToken: z.string(),
  toToken: z.string(),
  fromAmount: z.string(),
  toAmount: z.string(),
  createTime: z.number(),
  updateTime: z.number(),
})

// Validator for ButterSwap history API: { code: 200, message: 'success', data: { info: null } }
export const BridgeInfoNullResponseValidator = z.object({
  code: z.number(),
  message: z.string(),
  data: z.object({ info: z.null() }),
})

export const BridgeInfoResponseValidator = z.union([
  BridgeInfoValidator,
  z.array(BridgeInfoValidator),
  ErrorValidator,
  BridgeInfoNullResponseValidator,
])

export type BridgeInfo = Infer<typeof BridgeInfoValidator>
export type BridgeInfoResponse = Infer<typeof BridgeInfoResponseValidator>
