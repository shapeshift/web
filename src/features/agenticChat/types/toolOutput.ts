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
