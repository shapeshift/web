import type { Csp } from '../../types'

const REACT_APP_ONRAMPER_API_URL = process.env.REACT_APP_ONRAMPER_API_URL
const REACT_APP_ONRAMPER_WIDGET_URL = process.env.REACT_APP_ONRAMPER_WIDGET_URL

if (!REACT_APP_ONRAMPER_API_URL) throw new Error('REACT_APP_ONRAMPER_API_URL is required')
if (!REACT_APP_ONRAMPER_WIDGET_URL) throw new Error('REACT_APP_ONRAMPER_WIDGET_URL is required')

export const csp: Csp = {
  'connect-src': [REACT_APP_ONRAMPER_API_URL, REACT_APP_ONRAMPER_WIDGET_URL],
  'frame-src': [REACT_APP_ONRAMPER_WIDGET_URL],
}
