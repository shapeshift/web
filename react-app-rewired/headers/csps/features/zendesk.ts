import type { Csp } from '../../types'

export const csp: Csp = {
  'script-src': ['https://static.zdassets.com/'],
  'img-src': ['https://shapeshift.zendesk.com/'],
  'default-src': ['https://static.zdassets.com/'],
  'frame-src': ['http://www.youtube-nocookie.com/'],
  'connect-src': [
    'https://ekr.zdassets.com/compose/',
    'https://shapeshift.zendesk.com/',
    'wss://widget-mediator.zopim.com/',
  ],
}
