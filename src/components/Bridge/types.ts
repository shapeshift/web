import { AssetId } from '@shapeshiftoss/caip'

export enum BridgeAmountInputField {
  BUY = 'BUY',
  SELL = 'SELL',
  FIAT = 'FIAT',
}

// https://docs.axelar.dev/dev/build/chain-names/mainnet
export const AXELAR_CHAIN_NAMES = {
  Avalanche: 'Avalanche',
  Ethereum: 'Ethereum',
  Fantom: 'Fantom',
  Moonbeam: 'Moonbeam',
  Polygon: 'Polygon',
  Axelarnet: 'Axelarnet',
  Cosmoshub: 'cosmoshub',
  Crescent: 'crescent',
  Emoney: 'e-money',
  Injective: 'injective',
  Juno: 'juno',
  Kujira: 'kujira',
  Osmosis: 'osmosis',
  Secret: 'secret',
  Terra2: 'terra-2',
} as const

export type AxelarChainName = typeof AXELAR_CHAIN_NAMES[keyof typeof AXELAR_CHAIN_NAMES]

export type BridgeChain = {
  name: string
  balance: string
  fiatBalance: string
  color: string
}

export type BridgeAsset = {
  assetId: string
  symbol: string
  balance: string
  icon: string
  name: string
  cryptoAmount: string
  fiatAmount: string
  implementations?: {
    [key in string]: BridgeChain
  }
}

export type BridgeProps = {
  defaultBuyAssetId: AssetId
}

export type BridgeState = {
  asset: BridgeAsset | undefined
  fiatAmount: string
  cryptoAmount: string
  fromChain: BridgeChain | undefined
  toChain: BridgeChain | undefined
  receiveAddress: string | undefined
  depositAddress: string | undefined
  gasFeeUsdc: string | undefined
  gasFeeCrypto: string | undefined
}

export enum BridgeRoutePaths {
  Input = '/trade/input',
  Confirm = '/trade/confirm',
  Approval = '/trade/approval',
  SellSelect = '/trade/select/sell',
  SelectAsset = '/trade/select/asset',
  ChainFromSelect = '/trade/select/chain/from',
  ChainToSelect = '/trade/select/chain/to',
  Status = '/trade/status',
}
