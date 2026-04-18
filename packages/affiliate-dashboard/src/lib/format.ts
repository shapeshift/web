export const formatUsd = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

export const formatNumber = (value: number): string => new Intl.NumberFormat('en-US').format(value)

export const shortenAddress = (addr: string): string => `${addr.slice(0, 6)}...${addr.slice(-4)}`

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export const bpsToPercent = (bps: number): string => `${(bps / 100).toFixed(2)}%`
