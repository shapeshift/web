import type { Token } from '../../../../../index'

export const usdcToken: Token = {
  contract: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  decimals: 6,
  name: 'USD Coin',
  symbol: 'USDC',
}

export const wrappedEther: Token = {
  contract: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB',
  decimals: 18,
  name: 'Wrapped Ether',
  symbol: 'WETH.e',
}

export const wrappedBitcoin: Token = {
  contract: '0x50b7545627a5162F82A992c33b87aDc75187B218',
  decimals: 8,
  name: 'Wrapped BTC',
  symbol: 'WBTC.e',
}
