import type { Csp } from '../../../types'

export const csp: Csp = {
  'connect-src': [
    // @shapeshiftoss/swapper@1.15.0: https://github.com/shapeshift/lib/blob/f833ac7f8c70dee801eaa24525336ca6992e5903/packages/swapper/src/swappers/zrx/utils/zrxService.ts#L4
    'https://api.0x.org',
    // @shapeshiftoss/chain-adapters@1.22.1: https://github.com/shapeshift/lib/blob/476550629be9485bfc089decc4df85456968464a/packages/chain-adapters/src/ethereum/EthereumChainAdapter.ts#L226
    'https://gas.api.0x.org',
  ],
}
