import { toBaseUnit } from 'lib/math'

// This timestamp is the 03 of February 2025 10:30 PST
export const FOX_WIF_HAT_CAMPAIGN_STARTING_TIME_MS = 1738575000000
// 120 days from the start
export const FOX_WIF_HAT_CAMPAIGN_ENDING_TIME_MS =
  FOX_WIF_HAT_CAMPAIGN_STARTING_TIME_MS + 1000 * 60 * 60 * 24 * 120

// Assuming foxwifhat is 18 decimals
export const FOX_WIF_HAT_MINIMUM_AMOUNT_BASE_UNIT = toBaseUnit(10000, 18)
