export const ROLES = {
  buy: 'buy',
  sell: 'sell',
}

export const TRADE_STEPS_CLASSIC = ['initial', 'processing', 'complete']
export const TRADE_STEPS_MODERN = ['initial', 'confirm', 'processing', 'complete']

export const DEFAULT_BUY_ASSET = 'eth'
export const DEFAULT_SELL_ASSET = 'btc'

// Styles
export const OG_COLORS = {
  lightBlue: '#27394C',
  lighterBlue: '#8792A5',
  darkBlue: '#021735',
  orange: '#fa9400',
  green: '#63B866',
  darkGray: '#141B23',
}

const APP_HEADER_HEIGHT = '4.5rem'
const PAGE_HEADER_HEIGHT_CLASSIC = '300px'
export const PAGE_MARGIN_TOP_MODERN = '280px'
export const BODY_PADDING_TOP = '40px'
export const PAGE_HEIGHT_OFFSET_CLASSIC = `(${APP_HEADER_HEIGHT} + ${PAGE_HEADER_HEIGHT_CLASSIC} + ${BODY_PADDING_TOP})`
export const PAGE_HEIGHT_OFFSET_MODERN = `(${APP_HEADER_HEIGHT} + ${PAGE_MARGIN_TOP_MODERN})`
export const PAGE_HEIGHT_OFFSET_MOBILE = APP_HEADER_HEIGHT

// Defaults to be replaced once hooked up to actual data
export const DEFAULT_RECEIVE_AMOUNT = 34.48238
export const DEFAULT_SELL_AMOUNT = 0.2423
export const DEFAULT_RECEIVE_TX_ID = 'f3j35923H20HFFJ29898C32498OIJ52'
export const DEFAULT_SELL_TX_ID = '9834hf34H20HFFJ29898C32498OIJ355'
