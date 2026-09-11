export const ONE_CLICK_BASE_URL = 'https://1click.chaindefuser.com'

export const DEFAULT_SLIPPAGE_BPS = 50

// The refund cutoff we request - 1Click prices a quote the same at any length
export const DEFAULT_QUOTE_DEADLINE_MS = 60 * 60 * 1000
// Credited on the second confirmation, and 40-minute block gaps happen
export const UTXO_QUOTE_DEADLINE_MS = 4 * 60 * 60 * 1000
