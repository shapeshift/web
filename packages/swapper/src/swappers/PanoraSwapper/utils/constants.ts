export const PANORA_API_URL = 'https://api.panora.exchange'

export const PANORA_ROUTER_FUNCTION =
  '0x1c3206329806286fd2223647c9f9b130e66baeb6d7224a18c1f642ffe48f3b4c::panora_swap::router_entry'

// Positions of the router_entry arguments checked against the trade before it is quoted
export const PANORA_ROUTER_ARG_INDEX = {
  recipient: 1,
  sellAmounts: 16,
  integratorFeeAddress: 19,
} as const

// Panora's address for native APT, the fungible asset metadata object of the aptos coin
export const PANORA_NATIVE_TOKEN_ADDRESS = '0xa'

// Mainnet routes measured 0.002 APT without storage writes and up to 0.04 APT with them
export const PANORA_FALLBACK_NETWORK_FEE_CRYPTO_BASE_UNIT = '1000000'
