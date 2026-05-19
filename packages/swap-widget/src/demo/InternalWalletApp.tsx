import './App.css'

import { useCallback, useState } from 'react'

import { SwapWidget } from '../components/SwapWidget'
import { DemoCustomizer, useDemoTheme } from './DemoCustomizer'

const PROJECT_ID = 'f58c0242def84c3b9befe9b1e6086bbd'

type InternalDemoBodyProps = {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

const InternalDemoBody = ({ theme, setTheme }: InternalDemoBodyProps) => {
  const [showCustomizer, setShowCustomizer] = useState(true)

  const themeState = useDemoTheme(theme)
  const { themeConfig, partnerCode, demoStyle } = themeState

  const handleSwapSuccess = useCallback((txHash: string) => {
    console.log('Swap successful:', txHash)
  }, [])

  const handleSwapError = useCallback((error: Error) => {
    console.error('Swap failed:', error)
  }, [])

  return (
    <div className={`demo-app ${theme}`} style={demoStyle}>
      <header className='demo-header'>
        <a
          href='https://shapeshift.com'
          className='demo-logo'
          target='_blank'
          rel='noopener noreferrer'
        >
          <svg width='28' height='28' viewBox='0 0 57 62' fill='currentColor'>
            <path d='M51.67 5.1L48.97 21.3L39.37 10L51.67 5.1ZM49.03 28.27L51.43 37.14L33.06 42.2L49.03 28.27ZM9.03 23.8L18.88 10.93H35.99L46.92 23.8H9.03ZM45.66 26.99L27.85 42.53L9.7 26.99H45.66ZM15.58 10.01L6.78 21.51L4.08 5.17L15.58 10.01ZM22.57 42.2L4.02 37.15L6.56 28.48L22.57 42.2ZM25.99 46.43L22.49 50.28C19.53 47.46 16.26 44.96 12.78 42.83L25.99 46.43ZM42.98 42.77C39.5 44.94 36.24 47.47 33.29 50.32L29.72 46.42L42.98 42.77ZM55.73 0.06L36.42 7.75H18.42L0 0L4.18 25.3L0.17 38.99L10.65 45.26C15.61 48.23 20.06 51.94 23.86 56.3L27.94 60.97L32.23 56.06C35.9 51.84 40.18 48.22 44.95 45.29L55.23 38.99L51.52 25.31L55.73 0.06Z' />
          </svg>
          <span className='demo-logo-text'>ShapeShift</span>
        </a>

        <div className='demo-header-actions'>
          <div className='demo-theme-toggle' style={{ marginRight: 8 }}>
            <button className='demo-theme-btn active' type='button' disabled>
              Internal
            </button>
            <button
              className='demo-theme-btn'
              type='button'
              onClick={() => {
                window.location.hash = 'external'
                window.location.reload()
              }}
            >
              External
            </button>
          </div>
          <button
            className='demo-customize-btn'
            onClick={() => setShowCustomizer(!showCustomizer)}
            type='button'
          >
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <circle cx='12' cy='12' r='3' />
              <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' />
            </svg>
            Customize
          </button>
        </div>
      </header>

      <main className='demo-main'>
        <div className='demo-content'>
          <div className='demo-hero'>
            <h1 className='demo-title'>Swap Widget</h1>
            <p className='demo-subtitle'>
              Embeddable multi-chain swap widget powered by ShapeShift
            </p>
          </div>

          <div className='demo-layout'>
            {showCustomizer && (
              <DemoCustomizer theme={theme} setTheme={setTheme} state={themeState} />
            )}

            <div className='demo-widget-container'>
              <SwapWidget
                partnerCode={partnerCode || undefined}
                theme={themeConfig}
                onSwapSuccess={handleSwapSuccess}
                onSwapError={handleSwapError}
                showPoweredBy={true}
                showConnectButton={true}
                walletConnectProjectId={PROJECT_ID}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export const InternalWalletApp = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')

  return <InternalDemoBody theme={theme} setTheme={setTheme} />
}
