export type TokenData = {
  displayName: string
  precision: number
  contractAddress: string
  contractType: ContractTypes
  color: string
  secondaryColor: string
  icon: string
  explorer: string
  explorerTxLink: string
  sendSupport: boolean
  receiveSupport: boolean
  symbol: string
}
export type BaseAsset = {
  chain: string
  network: string
  symbol: string
  displayName: string
  precision: number
  slip44: number
  color: string
  secondaryColor: string
  icon: string
  explorer: string
  explorerTxLink: string
  sendSupport: boolean
  receiveSupport: boolean
  tokens?: TokenData
}

export enum ContractTypes {
  ERC20 = 'ERC20',
  ERC721 = 'ERC721',
  OTHER = 'OTHER',
  NONE = 'NONE'
}
