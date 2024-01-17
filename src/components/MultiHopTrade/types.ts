import type { HDWallet } from '@shapeshiftoss/hdwallet-core'
import type { GetTradeQuoteInput } from '@shapeshiftoss/swapper'
import type { AccountMetadata, Asset } from '@shapeshiftoss/types'

export type StepperStep = {
  title: string
  description?: string | JSX.Element
  stepIndicator: JSX.Element
  content?: JSX.Element
  key: string
}

export enum TradeRoutePaths {
  Input = '/trade/input',
  Confirm = '/trade/confirm',
  VerifyAddresses = '/trade/verify-addresses',
  Approval = '/trade/approval',
}

export type GetReceiveAddressArgs = {
  asset: Asset
  wallet: HDWallet
  deviceId: string
  accountMetadata: AccountMetadata
  pubKey?: string
}

export type TradeQuoteInputCommonArgs = Pick<
  GetTradeQuoteInput,
  | 'sellAmountIncludingProtocolFeesCryptoBaseUnit'
  | 'sellAsset'
  | 'buyAsset'
  | 'receiveAddress'
  | 'accountNumber'
  | 'affiliateBps'
  | 'potentialAffiliateBps'
  | 'allowMultiHop'
  | 'slippageTolerancePercentageDecimal'
>
