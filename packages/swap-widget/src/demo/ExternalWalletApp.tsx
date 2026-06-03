import './App.css'

import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { useCallback, useEffect, useState } from 'react'

import { SwapWidget } from '../components/SwapWidget'
import { initializeAppKit } from '../config/appkit'
import { truncateAddress } from '../types'
import { DemoCustomizer, useDemoTheme } from './DemoCustomizer'

const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID

const switchToInternal = () => {
  window.location.hash = ''
  window.location.reload()
}

type ConnectButtonProps = {
  address: string | undefined
  isConnected: boolean
}

const HostConnectButton = ({ address, isConnected }: ConnectButtonProps) => {
  const { open } = useAppKit()
  const handleClick = useCallback(() => open(), [open])

  const connectedAddress = isConnected ? address : undefined

  return (
    <button
      onClick={handleClick}
      type='button'
      className={`demo-connect-btn${connectedAddress ? ' demo-connected' : ''}`}
    >
      {connectedAddress ? (
        truncateAddress(connectedAddress)
      ) : (
        <>
          <svg
            width='14'
            height='14'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
          >
            <path d='M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1' />
            <path d='M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4' />
          </svg>
          Connect
        </>
      )}
    </button>
  )
}

type ExternalDemoBodyProps = {
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
}

const ExternalDemoBody = ({ theme, setTheme }: ExternalDemoBodyProps) => {
  const { address, isConnected } = useAppKitAccount()

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
            <button className='demo-theme-btn' type='button' onClick={switchToInternal}>
              Internal
            </button>
            <button className='demo-theme-btn active' type='button' disabled>
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

          <div className='demo-header-separator' />

          <HostConnectButton address={address} isConnected={isConnected} />
        </div>
      </header>

      <main className='demo-main'>
        <div className='demo-content'>
          <div className='demo-hero'>
            <h1 className='demo-title'>External Wallet Demo</h1>
            <p className='demo-subtitle'>
              Host page owns Reown AppKit; the widget reads it from the singleton
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
                showConnectButton={false}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const MODE_STORAGE_KEY = 'ssw-demo-mode'

const loadThemeMode = (): 'light' | 'dark' => {
  try {
    return localStorage.getItem(MODE_STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export const ExternalWalletApp = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>(loadThemeMode)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(MODE_STORAGE_KEY, theme)
    } catch {
      // ignore write failures (e.g. storage unavailable)
    }
  }, [theme])

  useEffect(() => {
    initializeAppKit(PROJECT_ID)
    setIsReady(true)
  }, [])

  if (!isReady) return null
  return <ExternalDemoBody theme={theme} setTheme={setTheme} />
}
