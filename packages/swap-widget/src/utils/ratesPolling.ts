// Rates feed the input step and every re-quote; the states in between only wait on a result
const RATES_CONSUMING_STATES = new Set(['idle', 'input', 'quoting', 'error', 'deposit_expired'])

export const shouldPollRates = (stateValue: unknown): boolean =>
  typeof stateValue === 'string' && RATES_CONSUMING_STATES.has(stateValue)
