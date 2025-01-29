import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { TradeAmountInputFormValues } from 'components/MultiHopTrade/components/TradeAmountInput'
import type { AddressSelectionValues } from 'pages/RFOX/types'

export enum StakeRoutePaths {
  Input = '/add/input',
  Confirm = '/add/confirm',
  Status = '/add/status',
}

export type StakeRouteProps = {
  headerComponent?: JSX.Element
  setStepIndex: (index: number) => void
}

export type RfoxStakingQuote = {
  stakingAssetAccountId: AccountId
  stakingAssetId: AssetId
  stakingAmountCryptoBaseUnit: string
  runeAddress: string
}

export type StakeInputValues = AddressSelectionValues & TradeAmountInputFormValues
