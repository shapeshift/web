export enum HypeLabEvent {
  WalletConnected = 'wallet_connected',
  TradeConfirm = 'trade_confirm',
  TradeSuccess = 'trade_success',
}

export const getHypeLab = (): { logEvent: (event: string) => void } | undefined => {
  const hypeLabEnabled = import.meta.env.VITE_ENABLE_HYPELAB === 'true'

  if (!hypeLabEnabled) return undefined

  const hypeLab = window.HypeLabAnalytics
  if (!hypeLab || typeof hypeLab.logEvent !== 'function') return undefined

  return hypeLab
}

export const trackHypeLabEvent = (event: HypeLabEvent): void => {
  const hypeLab = getHypeLab()
  if (hypeLab) {
    hypeLab.logEvent(event)
  }
}
