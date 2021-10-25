import { Asset } from '@shapeshiftoss/types'

type PercentAmounts = 25 | 50 | 75 | 100

type DepositProps = {
  asset: Asset
  // Estimated apy (Deposit Only)
  apy?: string // mocks dont show this anymore
  // Estimated fiat yield amount (Deposit Only)
  estimatedFiatYield: string
  // Estimated crypto yield amount (Deposit Only)
  estimatedCryptoYield: string
  // Users amount to Deposit or remove
  fiatAmount: string
  // Users available amount
  fiatAmountAvailable: string
  // Fiat Deposit and Gas Fees Total
  fiatTotalPlusFees: string
  // Users amount to Deposit or remove
  cryptoAmount: string
  // Users available amount
  cryptoAmountAvailable: string
  onPercentClick(percent: PercentAmounts): void
  onContinue(): void
  onCancel(): void
}

export const Deposit = (_: DepositProps) => {
  return <div>Deposit</div>
}
