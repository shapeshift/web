import type { Csp } from '../../types'

export const csp: Csp = {
  'img-src': ['https://icons.llamao.fi/', 'https://raw.githubusercontent.com/trustwallet/assets/'],
  'connect-src': ['https://evm-rpc.sei-apis.com/', 'https://forno.celo.org/'],
}
