export type SendSummary = {
  asset: string
  symbol: string
  amount: string
  from: string
  to: string
  network: string
  chainName: string
  estimatedFeeCrypto: string
  estimatedFeeSymbol: string
  estimatedFeeUsd?: string
  ataCreation?: boolean
}

export type SendData = {
  assetId: string
  from: string
  to: string
  amount: string
  chainId: string
  asset: {
    assetId: string
    chainId: string
    symbol: string
    name: string
    precision: number
    color: string
    icon: string
    explorer: string
    explorerTxLink: string
    explorerAddressLink: string
  }
}

export type Transaction = {
  chainId: string
  data: string
  from: string
  to: string
  value: string
  gasLimit?: string
}

export type SendOutput = {
  summary: SendSummary
  tx: Transaction
  sendData: SendData
}

export type SwapSummary = {
  sellAsset: {
    symbol: string
    amount: string
    network: string
    chainName: string
    valueUSD: string
    priceUSD: string
  }
  buyAsset: {
    symbol: string
    estimatedAmount: string
    network: string
    chainName: string
    estimatedValueUSD: string
    priceUSD: string
  }
  exchange: {
    provider: string
    rate: string
    priceImpact?: string
    networkFeeCrypto?: string
    networkFeeSymbol?: string
    networkFeeUsd?: string
  }
  isCrossChain: boolean
}

export type SwapData = {
  sellAmountCryptoPrecision: string
  buyAmountCryptoPrecision: string
  sellAmountUsd?: string
  buyAmountUsd?: string
  approvalTarget: string
  sellAsset: {
    assetId: string
    chainId: string
    symbol: string
    name: string
    precision: number
    color: string
    icon: string
    explorer: string
    explorerTxLink: string
    explorerAddressLink: string
    network: string
  }
  buyAsset: {
    assetId: string
    chainId: string
    symbol: string
    name: string
    precision: number
    color: string
    icon: string
    explorer: string
    explorerTxLink: string
    explorerAddressLink: string
    network: string
  }
  sellAccount: string
  buyAccount: string
}

export type SwapOutput = {
  summary: SwapSummary
  needsApproval: boolean
  approvalTx?: Transaction
  swapTx: Transaction
  swapData: SwapData
}

export type CancelLimitOrderOutput = {
  orderId: string
  chainId: number
  network: string
  signingData: {
    domain: unknown
    types: { OrderCancellations: { name: string; type: string }[] }
    primaryType: 'OrderCancellations'
    message: { orderUids: string[] }
  }
  trackingUrl: string
}

export type CreateLimitOrderOutput = {
  summary: {
    sellAsset: {
      symbol: string
      amount: string
    }
    buyAsset: {
      symbol: string
      estimatedAmount: string
    }
    network: string
    limitPrice: string
    expiresAt: string
    provider: string
  }
  signingData: unknown
  orderParams: {
    sellToken: string
    buyToken: string
    sellAmount: string
    buyAmount: string
    validTo: number
    receiver: string
    chainId: number
  }
  needsApproval: boolean
  approvalTx?: {
    from: string
    to: string
    data: string
    value: string
    chainId: string
  }
  approvalTarget: string
  trackingUrl: string
}

export type NewCoinsOutput = {
  coins: {
    id: string
    assetId?: string
    symbol: string
    name: string
    activatedAtFormatted: string
  }[]
}

export type TrendingTokensOutput = {
  tokens: {
    id: string
    assetId?: string
    symbol: string
    name: string
    price: string | null
    priceChange24h: number | null
    rank: number
  }[]
}

export type TopGainersLosersOutput = {
  gainers: {
    id: string
    assetId?: string
    symbol: string
    name: string
    price: string | null
    priceChange24h: number
  }[]
  losers: {
    id: string
    assetId?: string
    symbol: string
    name: string
    price: string | null
    priceChange24h: number
  }[]
  duration: string
}

export type PortfolioOutput = {
  totalValue: string
  accountAddress?: string
  network?: string
  assets: {
    assetId: string
    symbol: string
    name: string
    balance: string
    price: string | null
    value: string | null
  }[]
}

export type GetAssetsOutput = {
  assets: {
    assetId: string
    symbol: string
    name: string
    price: string
    icon?: string
    marketCap?: string | null
    volume24h?: string | null
    fdv?: string | null
    priceChange24h?: number | null
    circulatingSupply?: string | null
    totalSupply?: string | null
    maxSupply?: string | null
    sentimentVotesUpPercentage?: number | null
    sentimentVotesDownPercentage?: number | null
    marketCapRank?: number | null
    description?: string | null
  }[]
}

export type ReceiveOutput = {
  address: string
  network: string
  chainName: string
  asset: {
    assetId: string
    symbol: string
    name: string
  }
}

export type GetLimitOrdersOutput = {
  orders: {
    orderId: string
    status: 'open' | 'fulfilled' | 'cancelled' | 'expired' | 'presignaturePending'
    network: string
    sellTokenSymbol: string
    buyTokenSymbol: string
    sellAmount: string
    buyAmount: string
    filledPercent: number
    expiresAt: string
    trackingUrl: string
  }[]
}

export type GetTransactionHistoryOutput = {
  transactions: {
    txid: string
    type: 'send' | 'receive' | 'swap' | 'contract'
    status: 'success' | 'failed' | 'pending'
    timestamp: number
    from: string
    to: string
    value: string
    fee: string
    network: string
    tokenTransfers?: {
      symbol: string
      amount: string
      decimals: number
    }[]
  }[]
}

export type ToolOutputMap = {
  sendTool: SendOutput
  initiateSwapTool: SwapOutput
  initiateSwapUsdTool: SwapOutput
  cancelLimitOrderTool: CancelLimitOrderOutput
  createLimitOrderTool: CreateLimitOrderOutput
  getLimitOrdersTool: GetLimitOrdersOutput
  getAssetsTool: GetAssetsOutput
  transactionHistoryTool: GetTransactionHistoryOutput
  getNewCoinsTool: NewCoinsOutput
  receiveTool: ReceiveOutput
  getTopGainersLosersTool: TopGainersLosersOutput
  getTrendingTokensTool: TrendingTokensOutput
  mathCalculatorTool: never
}
