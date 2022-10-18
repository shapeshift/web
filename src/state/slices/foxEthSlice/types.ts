export type GetFoxEthLpMetricsReturn = {
  tvl: string
  apy: string
}

export type GetFoxEthLpMetricsArgs = {
  accountAddress: string
}

export type GetFoxEthLpAccountDataReturn = {
  underlyingFoxAmount: string
  underlyingEthAmount: string
  cryptoAmount: string
  fiatAmount: string
}

export type GetFoxFarmingContractMetricsReturn = {
  expired: boolean
} & GetFoxEthLpMetricsReturn

export type GetFoxFarmingContractMetricsArgs = {
  accountAddress: string
  contractAddress: string
}

export type GetFoxFarmingContractAccountDataReturn = {
  cryptoAmount: string
  fiatAmount: string
  unclaimedRewards: string
}

export type GetFoxFarmingContractAccountDataArgs = {
  contractAddress: string
  accountAddress: string
}

export type GetFoxEthLpAccountDataArgs = {
  accountAddress: string
}
