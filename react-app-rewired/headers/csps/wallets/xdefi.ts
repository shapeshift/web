import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': ['https://rpc.ankr.com/eth'], // allow XDEFI to broadcast tx's to their node
}
