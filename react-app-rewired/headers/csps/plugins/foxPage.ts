import type { Csp } from '../../types'

const REACT_APP_TOKEMAK_STATS_URL = process.env.REACT_APP_TOKEMAK_STATS_URL
const REACT_APP_BOARDROOM_API_BASE_URL = process.env.REACT_APP_BOARDROOM_API_BASE_URL

if (!REACT_APP_TOKEMAK_STATS_URL) throw new Error('REACT_APP_TOKEMAK_STATS_URL is required')
if (!REACT_APP_BOARDROOM_API_BASE_URL)
  throw new Error('REACT_APP_BOARDROOM_API_BASE_URL is required')

export const csp: Csp = {
  'connect-src': [
    'https://raw.githubusercontent.com/Uniswap/token-lists/master/test/schema/example.tokenlist.json',
    'https://raw.githubusercontent.com/Uniswap/default-token-list/master/src/tokens/mainnet.json',
    'https://raw.githubusercontent.com/compound-finance/token-list/master/compound.tokenlist.json',
    'https://api.tokemak.xyz/',
    REACT_APP_TOKEMAK_STATS_URL,
    'https://api.boardroom.info/',
    REACT_APP_BOARDROOM_API_BASE_URL,
  ],
}
