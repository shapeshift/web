// example: {rates: {EUR: 0.91}}
export type ExchangeRateHostRate = {
  rates: {
    [k: string]: number
  }
}

// example: {rates: {'2022-02-02': {EUR: 0.91}}}
export type ExchangeRateHostHistoryData = {
  rates: {
    [k: string]: {
      [j: string]: number
    }
  }
}
