// Type definitions inferred from validators.ts for ButterSwap

export type ErrorType = {
  errno: number
  message: string
  data?: unknown
}

export type Token = {
  address: string
  name: string
  decimals: number
  symbol: string
  icon: string
}

export type RouteChain = {
  chainId: string
  tokenIn: Token
  tokenOut: Token
  totalAmountIn: string
  totalAmountOut: string
  totalAmountOutUSD?: string
  route: {
    amountIn: string
    amountOut: string
    dexName: string
    path: unknown[]
    extra: string
  }[]
  bridge?: string
}

export type Affiliate = {
  amount: string
  list: unknown[]
  data: string
}

export type BridgeFee = {
  amount: string
  affiliate: Affiliate
  symbol?: string
  address?: string
  chainId?: number
  in?: number
  out?: number
}

export type RouteSuccessItem = {
  diff: string
  bridgeFee: BridgeFee
  tradeType: number
  gasFee: {
    amount: string
    symbol: string
    inUSD: string
  }
  swapFee: {
    nativeFee: string
    tokenFee: string
  }
  feeConfig: {
    feeType: number
    referrer: string
    rateOrNativeFee: number
  }
  gasEstimated: string
  gasEstimatedTarget: string
  timeEstimated: number
  hash: string
  entrance: string
  timestamp: number
  hasLiquidity: boolean
  srcChain: RouteChain
  bridgeChain?: RouteChain
  dstChain?: RouteChain
  totalAmountInUSD?: string
  totalAmountOutUSD?: string
  contract?: string
  minAmountOut?: {
    amount: string
    symbol: string
  }
  bridge?: string
}

export type RouteResponse =
  | {
      errno: 0
      message: string
      data: RouteSuccessItem[]
    }
  | ErrorType

export type BuildTxSuccessItem = {
  to: string
  data: string
  value: string
  chainId: string
  method?: string
  args?: { type: string; value: unknown }[]
}

export type BuildTxResponse =
  | {
      errno: 0
      message: string
      data: BuildTxSuccessItem[]
    }
  | ErrorType

export type TxParamArg = {
  type: string
  value: string
}

export type TxParamData = {
  to: string
  data: string
  value: string
  chainId: string
  method: string
  args: TxParamArg[]
}

export type TxParam = {
  errno: number
  message: string
  data: TxParamData[]
}

export type RouteAndSwapData = {
  route: RouteSuccessItem
  txParam: TxParam
}

export type RouteAndSwapResponse =
  | {
      errno: 0
      message: string
      data: RouteAndSwapData[]
    }
  | ErrorType

export type ChainInfo = {
  id: number
  chainId: string
  chainName: string
  scanUrl: string
  chainImg: string
  mosContract: string
  color: string | null
  nativeCoin: string
  nativeDecimal: number
}

export type TokenInfo = {
  id: number
  chainId: number | string
  address: string
  name: string
  symbol: string
  icon: string | null
  decimal: number
  isMainCurrency: number
  showSymbol?: string
}

export type BridgeInfo = {
  id?: number
  fromChain: ChainInfo
  toChain: ChainInfo
  sourceAddress: string
  amount: string
  fromToken: TokenInfo
  sourceHash: string
  relayerHash: string | undefined
  toHash: string | null
  receiveToken: TokenInfo
  receiveAmount: string
  toAddress: string
  destinationToken?: TokenInfo | null
  state: number
  timestamp: string
  timestampLong: number
  completeTime: string
  completeTimeLong: number
}

export type BridgeInfoNullResponse = {
  code: number
  message: string
  data: { info: null }
}

export type BridgeInfoResponse = BridgeInfo | BridgeInfo[] | ErrorType | BridgeInfoNullResponse

export type BridgeInfoApiResponse = {
  code: number
  message: string
  data: {
    info: BridgeInfo | null
  }
}
