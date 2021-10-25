import { Button } from '@chakra-ui/button'
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

export const Approve = ({ onConfirm }: ApproveProps) => {
  // const handleConfirm = () => {
  // do wallet stuff then call onConfirm callback
  // }
  return (
    <>
      <div>Approve</div>
      <Button onClick={onConfirm}>Next</Button>
    </>
  )
}
