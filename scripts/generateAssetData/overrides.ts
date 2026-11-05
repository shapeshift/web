import type { AssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'

const fox: Partial<Asset> = {
  color: '#3761F9',
  icon: '/fox-token-logo.png',
}

export const overrideAssets: Record<AssetId, Partial<Asset>> = {
  'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d': {
    name: 'FOX',
    ...fox,
  },
  'eip155:10/erc20:0xf1a0da3367bc7aa04f8d94ba57b862ff37ced174': {
    name: 'FOX',
    ...fox,
  },
  'eip155:100/erc20:0x21a42669643f45bc0e086b8fc2ed70c23d67509d': {
    name: 'FOX',
    ...fox,
  },
  'eip155:137/erc20:0x65a05db8322701724c197af82c9cae41195b0aa8': {
    name: 'FOX',
    ...fox,
  },
  'eip155:100/erc20:0xddafbb505ad214d7b80b1f830fccc89b60fb7a83': {
    name: 'USD Coin',
    precision: 6,
  },
  // StarkGate bridged tokens keep the L1 symbol on chain, and their CoinGecko names vary in style
  'starknet:SN_MAIN/token:0x0057912720381af14b0e5c87aa4718ed5e527eab60b3801ebf702ab09139e38b': {
    name: 'Starknet Bridged wstETH',
  },
  'starknet:SN_MAIN/token:0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3': {
    name: 'Starknet Bridged DAI V0',
    symbol: 'DAI_V0',
  },
  'starknet:SN_MAIN/token:0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac': {
    name: 'Starknet Bridged WBTC',
  },
  'starknet:SN_MAIN/token:0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7': {
    name: 'Starknet Bridged ETH',
  },
  'starknet:SN_MAIN/token:0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8': {
    name: 'Starknet Bridged USDC',
    symbol: 'USDC.E',
  },
  'starknet:SN_MAIN/token:0x05574eb6b8789a91466f902c380d978e472db68170ff82a5b650b95a58ddf4ad': {
    name: 'Starknet Bridged DAI',
  },
  'starknet:SN_MAIN/token:0x068f5c6a61780768455de69077e07e89787839bf8166decfbf92b645209c0fb8': {
    name: 'Starknet Bridged USDT',
  },
}
