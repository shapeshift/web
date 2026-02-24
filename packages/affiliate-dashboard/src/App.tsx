import { useCallback, useMemo, useState } from 'react'

import { useAffiliateStats } from './hooks/useAffiliateStats'

const formatUsd = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const formatNumber = (value: number): string => new Intl.NumberFormat('en-US').format(value)

export const App = (): React.JSX.Element => {
  const [address, setAddress] = useState('')
  const { stats, isLoading, error, fetchStats } = useAffiliateStats()

  const handleAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setAddress(e.target.value)
  }, [])

  const handleViewStats = useCallback((): void => {
    void fetchStats(address)
  }, [fetchStats, address])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        void fetchStats(address)
      }
    },
    [fetchStats, address],
  )

  const isButtonDisabled = useMemo(() => isLoading || !address.trim(), [isLoading, address])

  const statCards = useMemo(() => {
    if (!stats) return null
    return [
      {
        label: 'Total Swaps',
        value: formatNumber(stats.totalSwaps),
        icon: '⇄',
      },
      {
        label: 'Total Volume USD',
        value: formatUsd(stats.totalVolumeUsd),
        icon: '◈',
      },
      {
        label: 'Total Fees USD',
        value: formatUsd(stats.totalFeesUsd),
        icon: '✦',
      },
    ]
  }, [stats])

  return (
    <div style={styles.container}>
      <div style={styles.backdrop} />
      <div style={styles.content}>
        <header style={styles.header}>
          <div style={styles.logoMark}>◆</div>
          <h1 style={styles.title}>ShapeShift Affiliate Dashboard</h1>
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

        {error ? <div style={styles.error}>{error}</div> : null}

        {statCards ? (
          <div style={styles.statsGrid}>
            {statCards.map(card => (
              <div key={card.label} style={styles.statCard}>
                <div style={styles.cardIcon}>{card.icon}</div>
                <div style={styles.cardValue}>{card.value}</div>
                <div style={styles.cardLabel}>{card.label}</div>
              </div>
            ))}
          </div>
        ) : null}

        {!stats && !error && !isLoading ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>◇</div>
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
  logoMark: {
    fontSize: 32,
    color: '#386ff9',
    marginBottom: 16,
    letterSpacing: 2,
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
  cardIcon: {
    fontSize: 22,
    color: '#386ff9',
    marginBottom: 16,
    opacity: 0.8,
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
