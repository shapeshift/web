import type { AssetId } from '@shapeshiftoss/caip'

export type ChainflipLendingModalMode =
  | 'supply'
  | 'withdrawSupply'
  | 'deposit'
  | 'withdrawFromChainflip'
  | 'addCollateral'
  | 'removeCollateral'
  | 'borrow'
  | 'repay'
  | 'voluntaryLiquidation'

export type ChainflipLendingModalProps = {
  mode: ChainflipLendingModalMode
  assetId: AssetId
  loanId?: number
  liquidationAction?: 'initiate' | 'stop'
}
