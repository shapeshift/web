// Type definitions inferred from validators.ts for ButterSwap

export interface ErrorType {
  errno: number
  message: string
  data?: unknown
}

export interface Token {
  address: string
  name: string
  decimals: number
  symbol: string
  icon: string
}

export interface RouteChain {
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

export interface Affiliate {
  amount: string
  list: unknown[]
  data: string
}

export interface BridgeFee {
  amount: string
  affiliate: Affiliate
  symbol?: string
  address?: string
  chainId?: number
  in?: number
  out?: number
}

export interface RouteSuccessItem {
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

export interface BuildTxSuccessItem {
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

export interface TxParamArg {
  type: string
  value: string
}

export interface TxParamData {
  to: string
  data: string
  value: string
  chainId: string
  method: string
  args: TxParamArg[]
}

export interface TxParam {
  errno: number
  message: string
  data: TxParamData[]
}

export interface RouteAndSwapData {
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

export interface SupportedChainListResponse {
  errno: number
  message: string
  data: number[]
}

export interface FindTokenItem {
  id: number
  chainId: number
  address: string
  blockchainNetwork: string
  coingeckoId: string
  decimals: number
  image: string
  name: string
  rank: number
  symbol: string
  tokenSecurity: null
  usdprice: number
  usedIniframe: number
}

export interface FindTokenResponse {
  errno: number
  message: string
  data: FindTokenItem[]
}

export interface ChainInfo {
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

export interface TokenInfo {
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

export interface BridgeInfo {
  id?: number
  fromChain: ChainInfo
  toChain: ChainInfo
  sourceAddress: string
  amount: string
  fromToken: TokenInfo
  sourceHash: string
  relayerHash: string | undefined // undocumented, curl 'https://bs-app-api.chainservice.io/api/queryBridgeInfoBySourceHash?hash=0x7d663afc31b6a477d0d5269d859864e2570b7dc3278eed83aed653adeff01da0'
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

export interface BridgeInfoApiResponse {
  code: number
  message: string
  data: {
    info: BridgeInfo | null
  }
}
