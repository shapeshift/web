export type BIP44Params = {
  purpose: number
  coinType: number
  accountNumber: number
  isChange?: boolean
  index?: number
}

export enum KnownChainIds {
  EthereumMainnet = 'eip155:1',
  AvalancheMainnet = 'eip155:43114',
  BitcoinMainnet = 'bip122:000000000019d6689c085ae165831e93',
  BitcoinCashMainnet = 'bip122:000000000000000000651ef99cb9fcbe',
  DogecoinMainnet = 'bip122:00000000001a91e3dace36e2be3bf030',
  LitecoinMainnet = 'bip122:12a765e31ffd4059bada1e25190f6e98',
  CosmosMainnet = 'cosmos:cosmoshub-4',
  OsmosisMainnet = 'cosmos:osmosis-1',
  ThorchainMainnet = 'cosmos:thorchain-mainnet-v1',
}

export enum WithdrawType {
  DELAYED,
  INSTANT,
}

export enum UtxoAccountType {
  SegwitNative = 'SegwitNative',
  SegwitP2sh = 'SegwitP2sh',
  P2pkh = 'P2pkh',
}
