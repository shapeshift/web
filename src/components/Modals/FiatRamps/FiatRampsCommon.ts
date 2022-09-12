import type { BigNumber } from 'lib/bignumber/bignumber'

export enum FiatRampsRoutes {
  Select = '/fiat-ramp/select',
  Manager = '/fiat-ramp/manager',
}

export enum FiatRampAction {
  Buy = 'buy',
  Sell = 'sell',
}

export type FiatRampAsset = {
  name: string
  assetId: string
  symbol: string
  imageUrl?: string
  disabled?: boolean
  isBelowSellThreshold?: boolean
  fiatRampCoinId?: string
} & (
  | {
      cryptoBalance: BigNumber
      fiatBalance: BigNumber
    }
  | {
      cryptoBalance?: never
      fiatBalance?: never
    }
)
