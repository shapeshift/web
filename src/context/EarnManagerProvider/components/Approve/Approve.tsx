import { HDWallet } from '@shapeshiftoss/hdwallet-core'
import { Asset } from '@shapeshiftoss/types'

type ApproveProps = {
  asset: Asset
  cryptoEstimatedGasFee: string
  disableAction?: boolean
  fiatEstimatedGasFee: string
  learnMoreLink?: string
  loading: boolean
  onConfirm(): Promise<void>
  onCancel(): void
  wallet: HDWallet
}

export const Approve = (_: ApproveProps) => {
  // const handleConfirm = () => {
  // do wallet stuff then call onConfirm callback
  // }
  return <div>Approve</div>
}
