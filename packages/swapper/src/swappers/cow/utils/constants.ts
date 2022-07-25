import { AddressZero, HashZero } from '@ethersproject/constants'

export const MAX_ALLOWANCE = '100000000000000000000000000'
export const MAX_COWSWAP_TRADE = '100000000000000000000000000'
export const MIN_COWSWAP_VALUE_USD = 10
export const DEFAULT_SOURCE = [{ name: 'CowSwap', proportion: '1' }]
export const DEFAULT_ADDRESS = AddressZero
export const DEFAULT_APP_DATA = HashZero
export const COW_SWAP_VAULT_RELAYER_ADDRESS = '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110'
export const COW_SWAP_SETTLEMENT_ADDRESS = '0x9008D19f58AAbD9eD0D60971565AA8510560ab41'
export const WETH_ASSET_ID = 'eip155:1/erc20:0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

export const ORDER_KIND_SELL = 'sell'
export const SIGNING_SCHEME = 'ethsign'
export const ERC20_TOKEN_BALANCE = 'erc20'
export const ORDER_STATUS_FULFILLED = 'fulfilled'
