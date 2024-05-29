export type AddressSelectionValues = {
  manualRuneAddress: string | undefined
}

export enum StepIndex {
  Stake,
  Unstake,
  ChangeAddress,
  Bridge,
}
