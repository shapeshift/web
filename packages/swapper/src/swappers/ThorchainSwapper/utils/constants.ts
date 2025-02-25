import { CHAIN_REFERENCE } from '@shapeshiftmonorepo/caip'
import { Token } from '@uniswap/sdk-core'

export const THOR_EVM_GAS_LIMIT = '100000' // for sends of eth / erc20 into thorchain router
export const THORCHAIN_FIXED_PRECISION = 8 // limit values are precision 8 regardless of the chain
export const THORCHAIN_AFFILIATE_NAME = 'ss'
export const MEMO_PART_DELIMITER = ':'

export const WETH_TOKEN = new Token(
  Number(CHAIN_REFERENCE.EthereumMainnet),
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  18,
  'WETH',
  'Wrapped Ether',
)

export const WAVAX_TOKEN = new Token(
  Number(CHAIN_REFERENCE.AvalancheCChain),
  '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
  18,
  'WAVAX',
  'Wrapped AVAX',
)

export const WBNB_TOKEN = new Token(
  Number(CHAIN_REFERENCE.BnbSmartChainMainnet),
  '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
  18,
  'WBNB',
  'Wrapped BNB',
)
