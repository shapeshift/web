import { Asset } from '@shapeshiftoss/types'

type PercentAmounts = 25 | 50 | 75 | 100

type WithdrawProps = {
  asset: Asset
  // Users amount to add or Withdraw
  fiatAmount: string
  // Users available amount
  fiatAmountAvailable: string
  // Users amount to add or Withdraw
  cryptoAmount: string
  // Users available amount
  cryptoAmountAvailable: string
  onPercentClick(percent: PercentAmounts): void
  onContinue(): void
  onCancel(): void
}

export const Withdraw = (_: WithdrawProps) => {
  return <div>Withdraw</div>
}
