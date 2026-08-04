export type ThorchainRunepoolInformationResponseSuccess = {
  pol: {
    rune_deposited: string
    rune_withdrawn: string
    value: string
    pnl: string
    current_deposit: string
  }
  providers: {
    units: string
    pending_units: string
    pending_rune: string
    value: string
    pnl: string
    current_deposit: string
  }
  reserve: {
    units: string
    value: string
    pnl: string
    current_deposit: string
  }
}

export type ThorchainRunepoolProviderResponseSuccess = {
  rune_address: string
  units: string
  value: string
  pnl: string
  deposit_amount: string
  withdraw_amount: string
  last_deposit_height: number
  last_withdraw_height: number
}

export type ThorchainRunepoolReservePositionsResponse = {
  pools: {
    assetAdded: string
    assetAddress: string
    assetDeposit: string
    assetPending: string
    assetWithdrawn: string
    dateFirstAdded: string
    dateLastAdded: string
    liquidityUnits: string
    pool: string
    runeAdded: string
    runeAddress: string
    runeDeposit: string
    runePending: string
    runeWithdrawn: string
  }[]
}

export type ThorchainRunepoolMemberPositionResponse = {
  runeAddress: string
  units: string
  runeAdded: string
  runeDeposit: string
  runeWithdrawn: string
  dateFirstAdded: string
  dateLastAdded: string
}
