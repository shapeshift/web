// https://docs.axelar.dev/dev/build/chain-names/mainnet
import type { AccountSpecifier } from 'state/slices/portfolioSlice/portfolioSliceCommon'

export enum AxelarChainNames {
  Avalanche = 'Avalanche',
  Ethereum = 'Ethereum',
  Fantom = 'Fantom',
  Moonbeam = 'Moonbeam',
  Polygon = 'Polygon',
  Axelarnet = 'Axelarnet',
  Cosmoshub = 'cosmoshub',
  Crescent = 'crescent',
  Emoney = 'e-money',
  Injective = 'injective',
  Juno = 'juno',
  Kujira = 'kujira',
  Osmosis = 'osmosis',
  Secret = 'secret',
  Terra2 = 'terra-2',
}

export type AxelarChainName = `${AxelarChainNames}`

export type BridgeChain = {
  name: AxelarChainName
  balance: string
  fiatBalance: string
  symbol: string
  color: string
}

export type BridgeAsset = {
  assetId: AccountSpecifier
  symbol: string
  icon: string
  name: string
  cryptoAmount: string
  fiatAmount: string
  implementations?: {
    [key: string]: BridgeChain
  }
}

export type BridgeState = {
  asset: BridgeAsset
  fiatAmount: string
  cryptoAmount: string
  fromChain: BridgeChain | undefined
  toChain: BridgeChain | undefined
  receiveAddress: string
  depositAddress: string
  relayerFeeUsdc: string
}

export enum BridgeRoutePaths {
  Input = '/trade/input',
  Confirm = '/trade/confirm',
  Approval = '/trade/approval',
  SelectAsset = '/trade/select/asset',
  ChainFromSelect = '/trade/select/chain/from',
  ChainToSelect = '/trade/select/chain/to',
  Status = '/trade/status',
}
