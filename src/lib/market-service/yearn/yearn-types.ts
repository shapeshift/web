type VaultDayDatum = {
  pricePerShare: string
  timestamp: string
  tokenPriceUSDC: string
}

type VaultPosition = {
  vault: {
    vaultDayData: VaultDayDatum[]
  }
}

export type VaultDayDataGQLResponse = {
  data: {
    account: {
      vaultPositions: VaultPosition[]
    }
  }
}
