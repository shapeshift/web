import { TronWeb } from 'tronweb'

import type { SwapRouteParameters } from './buildSwapRouteParameters'

export const SUNIO_SWAP_EXACT_INPUT_SELECTOR =
  'swapExactInput(address[],string[],uint256[],uint24[],(uint256,uint256,address,uint256))'

const convertAddressesToEvmFormat = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(v => convertAddressesToEvmFormat(v))
  }

  if (typeof value === 'string' && value.startsWith('T') && TronWeb.isAddress(value)) {
    const hex = TronWeb.address.toHex(value)
    return hex.replace(/^41/, '0x')
  }

  return value
}

// Parameter list for the SmartExchangeRouter swapExactInput call, shared between fee
// estimation and execution so both encode the call identically.
export const buildSwapExactInputParameters = (routeParams: SwapRouteParameters) => [
  { type: 'address[]', value: routeParams.path },
  { type: 'string[]', value: routeParams.poolVersion },
  { type: 'uint256[]', value: routeParams.versionLen },
  { type: 'uint24[]', value: routeParams.fees },
  {
    type: 'tuple(uint256,uint256,address,uint256)',
    value: convertAddressesToEvmFormat([
      routeParams.swapData.amountIn,
      routeParams.swapData.amountOutMin,
      routeParams.swapData.recipient,
      routeParams.swapData.deadline,
    ]),
  },
]
