export const PANORA_API_URL = 'https://api.panora.exchange'

// 0.01 APT, between measured routes of 0.002 APT (no storage writes) and 0.04 APT (with)
export const PANORA_FALLBACK_NETWORK_FEE_CRYPTO_BASE_UNIT = '1000000'

// Panora pays the integrator half of integratorFeePercentage and keeps the rest, so request double to receive affiliateBps
export const PANORA_INTEGRATOR_FEE_SPLIT_MULTIPLIER = 2
