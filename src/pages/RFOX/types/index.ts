export type AddressSelectionValues = {
  manualRuneAddress: string | undefined
}

export type EpochMetadata = {
  startBlockNumber: bigint
  endBlockNumber: bigint
  startTimestamp: bigint
  endTimestamp: bigint
  distributionAmountRuneBaseUnit: bigint
}
