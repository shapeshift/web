import type { Csp } from '../../types'

// full reference here - this is a subset and the minimal set of headers required for zendesk to function
// https://developer.zendesk.com/documentation/classic-web-widget-sdks/web-widget/integrating-with-google/csp/
export const csp: Csp = {
  'script-src': ['https://static.zdassets.com/'],
  'img-src': ['https://shapeshift.zendesk.com/'],
  'default-src': ['https://static.zdassets.com/'],
  'frame-src': ['http://www.youtube-nocookie.com/'], // required for videos embedded in help articles
  'connect-src': [
    'https://ekr.zdassets.com/compose/',
    'https://shapeshift.zendesk.com/',
    'wss://widget-mediator.zopim.com/',
  ],
}
