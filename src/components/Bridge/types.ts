// https://docs.axelar.dev/dev/build/chain-names/mainnet
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
  name: string
  balance: string
  fiatBalance: string
  symbol: string
  color: string
}

export type BridgeAsset = {
  assetId: string
  symbol: string
  icon: string
  name: string
  cryptoAmount: string
  fiatAmount: string
  implementations?: {
    [key in string]: BridgeChain
  }
}

export type BridgeState = {
  asset: BridgeAsset | undefined
  fiatAmount: string
  cryptoAmount: string
  fromChain: BridgeChain | undefined
  toChain: BridgeChain | undefined
  receiveAddress: string | undefined
  depositAddress: string | undefined
  relayerFeeUsdc: string | undefined
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
