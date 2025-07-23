import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { JSX } from 'react'

import type { AddressSelectionValues } from '@/pages/RFOX/types'

export enum ChangeAddressRoutePaths {
  Input = '/change-address/input',
  Confirm = '/change-address/confirm',
}

export type ChangeAddressRouteProps = {
  headerComponent?: JSX.Element
}

export type RfoxChangeAddressQuote = {
  stakingAssetAccountId: AccountId
  stakingAssetId: AssetId
  newRuneAddress: string
  currentRuneAddress: string
}

export type ChangeAddressInputValues = AddressSelectionValues & {
  newRuneAddress: string | undefined
}
