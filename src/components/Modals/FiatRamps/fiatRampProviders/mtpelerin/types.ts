export type MtPelerinQuoteResponse = {
  fees: {
    networkFee: string
    fixFee: number
  }
  sourceCurrency: string
  destCurrency: string
  sourceNetwork: string
  destNetwork: string
  sourceAmount: number
  destAmount: string
}

export type MtPelerinSellLimitsResponse = {
  destCurrency: string
  limit: string
}
