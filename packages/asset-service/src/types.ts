export type TokenAsset = {
  name: string
  precision: number
  tokenId: string
  contractType: ContractTypes
  color: string
  secondaryColor: string
  icon: string
  sendSupport: boolean
  receiveSupport: boolean
  symbol: string
}
export type BaseAsset = {
  chain: string
  network: NetworkTypes
  symbol: string
  name: string
  precision: number
  slip44: number
  color: string
  secondaryColor: string
  icon: string
  explorer: string
  explorerTxLink: string
  sendSupport: boolean
  receiveSupport: boolean
  tokens?: TokenAsset[]
}

export type Asset = {
  chain: string
  network: NetworkTypes
  symbol: string
  name: string
  precision: number
  color: string
  secondaryColor: string
  icon: string
  sendSupport: boolean
  receiveSupport: boolean
  explorer?: string
  explorerTxLink?: string
  slip44?: number
  tokenId?: string
  contractType?: ContractTypes
}

export enum ContractTypes {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  OTHER = 'OTHER',
  NONE = 'NONE'
}

export enum NetworkTypes {
  BTC_MAINNET = 'BTC_MAINNET',
  BTC_TESTNET = 'BTC_TESTNET',
  ETH_MAINNET = 'ETH_MAINNET',
  ETH_ROPSTEN = 'ETH_ROPSTEN'
}
