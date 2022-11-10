import type { Csp } from '../../types'

export const csp: Csp = {
  'frame-src': ['https://widget.onramper.com', 'https://swap.onramper.com', 'https://buy.moonpay.com'],
  'frame-ancestors': ['*'],
  'connect-src': [process.env.REACT_APP_ONRAMPER_API_URL!, process.env.REACT_APP_ONRAMPER_WIDGET_URL!],
}
