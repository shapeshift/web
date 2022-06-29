export declare const MAX_ALLOWANCE = '100000000000000000000000000'
export const MAX_COWSWAP_TRADE = '100000000000000000000000000'
export const MIN_COWSWAP_VALUE_USD = 10
export const DEFAULT_SOURCE = [{ name: 'CowSwap', proportion: '1' }]
export const DEFAULT_ADDRESS = '0x0000000000000000000000000000000000000000'
export const DEFAULT_APP_DATA = '0x0000000000000000000000000000000000000000000000000000000000000000'
export const COW_SWAP_VAULT_RELAYER_ADDRESS = '0xc92e8bdf79f0507f65a392b0ab4667716bfe0110'

// CowSwap API requires validTo field which specifies a limit date for the order to be valid
// This is the default value being used by CowSwap exchange, corresponding to a date in year 2106
export const DEFAULT_VALIDTO_TIMESTAMP = 4294967295
export const ORDER_KIND_SELL = 'sell'
