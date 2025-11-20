import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    'https://signing.gridpl.us',
    'https://gridplus.github.io',
    'https://www.4byte.directory',
    // Block explorer APIs used by gridplus-sdk for ABI fetching
    // See: https://gridplus.github.io/chains/chains.json
    'https://api.etherscan.io',
    'https://api-optimistic.etherscan.io',
    'https://api.polygonscan.com',
    'https://api.bscscan.com',
    'https://api.arbiscan.io',
    'https://api-nova.arbiscan.io',
    'https://api.snowtrace.io',
    'https://api.basescan.org',
    'https://api.gnosisscan.io',
  ],
}
