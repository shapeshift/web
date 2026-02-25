import { useCallback, useEffect, useMemo, useState } from 'react'

import { useAffiliateStats } from './hooks/useAffiliateStats'

const formatUsd = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatNumber = (value: number): string => new Intl.NumberFormat('en-US').format(value)

interface Period {
  label: string
  startDate?: string
  endDate?: string
}

const periods: Period[] = [
  {
    label: 'February 2026',
    startDate: '2026-02-05T00:00:00.000Z',
    endDate: '2026-03-05T00:00:00.000Z',
  },
  { label: 'All Time' },
]

const ShapeShiftLogo = (): React.JSX.Element => (
  <svg width='194' height='48' viewBox='0 0 194 48' fill='none' xmlns='http://www.w3.org/2000/svg'>
    <g clipPath='url(#clip0_30_551)'>
      <path
        d='M40.4235 29.8652L42.1786 26.8359C43.4402 27.7722 45.8535 28.5984 47.8829 28.5984C49.9123 28.5984 49.5284 28.323 49.5284 27.9375C49.5284 27.3867 48.4862 27.3316 47.115 27.1664C44.5371 26.8359 40.8074 26.2851 40.8074 22.9254C40.8074 19.5657 43.4402 18.5743 47.7184 18.5743C51.9966 18.5743 52.6548 19.1802 54.4648 20.3919L52.7096 23.311C51.1738 22.3196 48.925 21.8239 47.2796 21.8239C45.6341 21.8239 46.2374 21.9891 46.2374 22.3746C46.2374 22.9254 47.3344 23.0907 48.7605 23.311C51.2835 23.6965 54.8487 24.2473 54.8487 27.3867C54.8487 30.5261 52.1063 31.9581 47.9926 31.9581C43.8789 31.9581 41.9592 31.0769 40.3686 29.8652H40.4235Z'
        fill='currentColor'
      />
      <path
        d='M56.3293 18.7949H61.4302V23.0358H66.6957V18.7949H71.7966V31.7381H66.6957V27.1116H61.4302V31.7381H56.3293V18.7949Z'
        fill='currentColor'
      />
      <path
        d='M78.653 18.7949H84.467L90.5552 31.7381H84.9058L84.3024 30.1408H78.8724L78.2691 31.7381H72.6196L78.7079 18.7949H78.653ZM82.9861 26.9463L81.56 23.2561L80.1339 26.9463H83.0409H82.9861Z'
        fill='currentColor'
      />
      <path
        d='M91.2681 18.7949H101.525C104.596 18.7949 106.406 20.6124 106.406 23.3112C106.406 26.01 104.651 27.8276 101.525 27.8276H96.4239V31.7932H91.323V18.85L91.2681 18.7949ZM100.428 24.1374C101.031 24.1374 101.415 23.862 101.415 23.3112C101.415 22.7605 101.031 22.5401 100.428 22.5401H96.3691V24.1925H100.428V24.1374Z'
        fill='currentColor'
      />
      <path
        d='M107.942 18.7949H121.599V22.3198H113.043V23.6417H121.27V26.8362H113.043V28.2682H121.599V31.7932H107.942V18.7949Z'
        fill='currentColor'
      />
      <path
        d='M123.19 29.8652L124.945 26.836C126.207 27.7723 128.62 28.5985 130.65 28.5985C132.679 28.5985 132.295 28.3231 132.295 27.9375C132.295 27.3868 131.253 27.3317 129.882 27.1664C127.304 26.836 123.574 26.2852 123.574 22.9255C123.574 19.5658 126.207 18.5744 130.485 18.5744C134.763 18.5744 135.421 19.1802 137.231 20.3919L135.476 23.311C133.941 22.3196 131.692 21.8239 130.046 21.8239C128.401 21.8239 129.004 21.9892 129.004 22.3747C129.004 22.9255 130.101 23.0907 131.527 23.311C134.05 23.6966 137.615 24.2473 137.615 27.3868C137.615 30.5262 134.873 31.9582 130.759 31.9582C126.646 31.9582 124.726 31.0769 123.135 29.8652H123.19Z'
        fill='currentColor'
      />
      <path
        d='M139.096 18.7949H144.197V23.0358H149.463V18.7949H154.563V31.7381H149.463V27.1116H144.197V31.7381H139.096V18.7949Z'
        fill='currentColor'
      />
      <path d='M156.922 18.7949H162.023V31.7381H156.922V18.7949Z' fill='currentColor' />
      <path
        d='M164.381 18.7949H177.764V22.3198H169.482V23.6417H177.435V26.8362H169.482V31.7932H164.381V18.7949Z'
        fill='currentColor'
      />
      <path
        d='M184.347 22.9257H179.794V18.7949H194V22.9257H189.448V31.7932H184.292V22.9257H184.347Z'
        fill='currentColor'
      />
      <path
        d='M29.4538 8.99139C29.4538 8.44062 29.015 8 28.4665 8C27.918 8 28.2471 8 28.1374 8.05508H28.0826L19.581 11.6351H9.98248L1.37122 8.05508C1.26152 8.05508 1.15183 8 0.987279 8C0.438791 8 0 8.44062 0 8.99139C0 9.54217 0 9.04647 0 9.10155C0 9.15663 1.97456 21.2186 1.97456 21.2186L0.0548487 27.7728C0.0548487 27.938 0.0548487 27.9931 0.0548487 28.1033C0.0548487 28.4888 0.274244 28.8193 0.548488 28.9845L6.80125 32.179C9.3243 33.7212 10.3664 35.4836 12.2861 37.7418L13.9316 39.6145V39.7246C14.2058 39.8898 14.4252 40 14.6995 40C14.9737 40 15.248 39.8898 15.4125 39.6695L17.058 37.7418C18.9777 35.4836 20.0198 33.7212 22.5429 32.179L28.7956 28.9845C29.1247 28.8193 29.2893 28.4888 29.2893 28.1033C29.2893 27.7177 29.2893 27.938 29.2893 27.8279L27.3696 21.2737L29.3441 9.15663C29.3441 9.15663 29.3441 9.10155 29.3441 9.04647L29.4538 8.99139ZM26.5468 11.4699L25.4498 18.2444L21.8298 13.5077L26.6017 11.525L26.5468 11.4699ZM10.2567 14.1687H19.1422L23.585 20.0069H5.81397L10.2567 14.1687ZM14.7543 29.6454L6.47216 22.5404H23.0365L14.7543 29.6454ZM7.67883 13.4527L4.05881 18.1893L2.96184 11.4148L7.73368 13.3976L7.67883 13.4527ZM2.90699 27.1119L3.94911 23.9725L11.0246 30.3064L2.90699 27.1119ZM14.7543 36.0344L11.6279 32.2892L14.7543 32.7298L17.8807 32.2892L14.7543 36.0344ZM18.4292 30.3064L25.5047 23.9725L26.5468 27.1119L18.4292 30.3064Z'
        fill='currentColor'
      />
    </g>
    <defs>
      <clipPath id='clip0_30_551'>
        <rect width='194' height='48' fill='currentColor' />
      </clipPath>
    </defs>
  </svg>
)

export const App = (): React.JSX.Element => {
  const [address, setAddress] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState(0)
  const { stats, isLoading, error, fetchStats } = useAffiliateStats()

  const currentPeriod = periods[selectedPeriod]

  const doFetch = useCallback((): void => {
    if (!address.trim()) return
    void fetchStats(address, {
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
    })
  }, [fetchStats, address, currentPeriod])

  const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setAddress(e.target.value)
  }, [])

  const handleViewStats = useCallback((): void => {
    doFetch()
  }, [doFetch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        doFetch()
      }
    },
    [doFetch],
  )

  useEffect(() => {
    if (address.trim()) doFetch()
  }, [selectedPeriod]) // eslint-disable-line react-hooks/exhaustive-deps

  const isButtonDisabled = useMemo(() => isLoading || !address.trim(), [isLoading, address])

  const statCards = useMemo(() => {
    if (!stats) return null
    return [
      {
        label: 'Total Swaps',
        value: formatNumber(stats.totalSwaps),
      },
      {
        label: 'Total Volume USD',
        value: formatUsd(stats.totalVolumeUsd),
      },
      {
        label: 'Total Fees USD',
        value: formatUsd(stats.totalFeesUsd),
      },
    ]
  }, [stats])

  return (
    <div style={styles.container}>
      <div style={styles.backdrop} />
      <div style={styles.content}>
        <header style={styles.header}>
          <div style={styles.logo}>
            <ShapeShiftLogo />
          </div>
          <h1 style={styles.title}>Affiliate Dashboard</h1>
          <p style={styles.subtitle}>Track your affiliate performance and earnings</p>
        </header>

        <div style={styles.inputGroup}>
          <div style={styles.inputWrapper}>
            <input
              type='text'
              value={address}
              onChange={handleAddressChange}
              onKeyDown={handleKeyDown}
              placeholder='Enter affiliate address (0x...)'
              style={styles.input}
              spellCheck={false}
              autoComplete='off'
            />
          </div>
          <button
            onClick={handleViewStats}
            disabled={isButtonDisabled}
            style={{
              ...styles.button,
              ...(isButtonDisabled ? styles.buttonDisabled : {}),
            }}
          >
            {isLoading ? 'Loading…' : 'View Stats'}
          </button>
        </div>

        <div style={styles.periodRow}>
          {periods.map((period, i) => (
            <button
              key={period.label}
              onClick={() => setSelectedPeriod(i)}
              style={{
                ...styles.periodButton,
                ...(selectedPeriod === i ? styles.periodButtonActive : {}),
              }}
            >
              {period.label}
            </button>
          ))}
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}

        {statCards ? (
          <div style={styles.statsGrid}>
            {statCards.map(card => (
              <div key={card.label} style={styles.statCard}>
                <div style={styles.cardValue}>{card.value}</div>
                <div style={styles.cardLabel}>{card.label}</div>
              </div>
            ))}
          </div>
        ) : null}

        {!stats && !error && !isLoading ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>
              Enter an affiliate address above to view performance stats.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#0a0b0d',
    color: '#e2e4e9',
    fontFamily: '"DM Sans", "Söhne", -apple-system, BlinkMacSystemFont, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background:
      'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(56, 111, 249, 0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(56, 111, 249, 0.06) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    maxWidth: 720,
    margin: '0 auto',
    padding: '80px 24px 60px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 48,
  },
  logo: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 16,
    color: '#f0f1f4',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    margin: '0 0 8px',
    color: '#f0f1f4',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 15,
    color: '#7a7e8a',
    margin: 0,
    fontWeight: 400,
  },
  inputGroup: {
    display: 'flex',
    gap: 12,
    marginBottom: 32,
  },
  inputWrapper: {
    flex: 1,
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    fontSize: 15,
    fontFamily: '"DM Mono", "SF Mono", "Fira Code", monospace',
    background: '#12141a',
    border: '1px solid #1e2028',
    borderRadius: 12,
    color: '#e2e4e9',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box',
  },
  button: {
    padding: '14px 28px',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: '"DM Sans", "Söhne", -apple-system, BlinkMacSystemFont, sans-serif',
    background: '#386ff9',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  buttonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  error: {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    padding: '14px 18px',
    color: '#f87171',
    fontSize: 14,
    marginBottom: 24,
  },
  periodRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 24,
  },
  periodButton: {
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: '"DM Sans", "Söhne", -apple-system, BlinkMacSystemFont, sans-serif',
    background: '#12141a',
    border: '1px solid #1e2028',
    borderRadius: 10,
    color: '#7a7e8a',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  periodButtonActive: {
    background: 'rgba(56, 111, 249, 0.12)',
    borderColor: '#386ff9',
    color: '#386ff9',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
  statCard: {
    background: '#12141a',
    border: '1px solid #1e2028',
    borderRadius: 16,
    padding: '28px 24px',
    textAlign: 'center',
    transition: 'border-color 0.2s ease, transform 0.2s ease',
  },
  cardValue: {
    fontSize: 26,
    fontWeight: 700,
    color: '#f0f1f4',
    marginBottom: 6,
    letterSpacing: '-0.02em',
    fontFamily: '"DM Mono", "SF Mono", "Fira Code", monospace',
  },
  cardLabel: {
    fontSize: 13,
    color: '#7a7e8a',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: 36,
    color: '#2a2d38',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 15,
    color: '#4a4e5a',
    margin: 0,
    lineHeight: 1.6,
  },
}
