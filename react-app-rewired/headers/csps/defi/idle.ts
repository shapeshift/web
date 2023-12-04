import type { Csp } from '../../types'

export const csp: Csp = {
  'connect-src': [
    'https://api.idle.finance',
    'https://raw.githubusercontent.com/Idle-Labs/idle-dashboard-new/',
  ],
  'img-src': [
    'https://rawcdn.githack.com/Idle-Labs/idle-dashboard-new/',
    'https://raw.githack.com/Idle-Labs/idle-dashboard-new/',
    'https://app.idle.finance/images/tokens/',
    'https://raw.githubusercontent.com/Idle-Labs/idle-dashboard-new/',
  ],
}
