// example: {quotes: {EUR: 0.91}}
export type ExchangeRateHostRate = {
  quotes: {
    [k: string]: number
  }
}

// example: {source: 'USD', quotes: {'2022-02-02': {USDEUR: 0.91}}}
export type ExchangeRateHostHistoryData = {
  source: string
  quotes: {
    [k: string]: {
      [j: string]: number
    }
  }
}
