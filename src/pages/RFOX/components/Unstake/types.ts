import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { JSX } from 'react'

import type { TradeAmountInputFormValues } from '@/components/MultiHopTrade/components/TradeAmountInput'

export enum UnstakeRoutePaths {
  Input = '/remove/input',
  Confirm = '/remove/confirm',
}

export type UnstakeRouteProps = {
  headerComponent?: JSX.Element
}

export type RfoxUnstakingQuote = {
  stakingAssetAccountId: AccountId
  stakingAssetId: AssetId
  unstakingAmountCryptoBaseUnit: string
  cooldownPeriod: string
}
export type UnstakeInputValues = TradeAmountInputFormValues & { percentage: number }
