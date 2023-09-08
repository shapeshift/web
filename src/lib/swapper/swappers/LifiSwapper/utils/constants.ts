export const MIN_CROSS_CHAIN_AMOUNT_THRESHOLD_USD_HUMAN = 20 // arbitrary amount deemed by lifi devs to meet minimum amount across all brdiges
export const MIN_SAME_CHAIN_AMOUNT_THRESHOLD_USD_HUMAN = '0.01' // Same chain bridges can be of any amount, since fees are paid explicitly as miner fees in one chain
export const SELECTED_ROUTE_INDEX = 0 // default to first route - this is the highest ranking according to the query we send
export const DEFAULT_LIFI_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'
export const OPTIMISM_GAS_ORACLE_ADDRESS = '0x420000000000000000000000000000000000000f'

// used for analytics and donations - do not change this without considering impact
export const LIFI_INTEGRATOR_ID = 'shapeshift'
