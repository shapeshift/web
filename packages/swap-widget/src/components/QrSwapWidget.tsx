import './QrSwapWidget.css'

import { ethChainId, usdcAssetId } from '@shapeshiftoss/caip'
import { ethereum } from '@shapeshiftoss/utils'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

import { createApiClient } from '../api/client'
import { useChainInfo } from '../hooks/useAssets'
import { formatUsdValue, useMarketData } from '../hooks/useMarketData'
import { useSwapRates } from '../hooks/useSwapRates'
import type { Asset, SwapWidgetProps, ThemeMode, TradeRate } from '../types'
import { formatAmount, getChainType, parseAmount, truncateAddress } from '../types'
import { QuoteSelector } from './QuoteSelector'
import { SettingsModal } from './SettingsModal'
import { TokenSelectModal } from './TokenSelectModal'

const DEFAULT_SELL_ASSET: Asset = {
  assetId: ethereum.assetId,
  chainId: ethereum.chainId,
  symbol: ethereum.symbol,
  name: ethereum.name,
  precision: ethereum.precision,
  icon: ethereum.icon,
  networkName: ethereum.networkName,
  explorer: ethereum.explorer,
  explorerTxLink: ethereum.explorerTxLink,
  explorerAddressLink: ethereum.explorerAddressLink,
}

const DEFAULT_BUY_ASSET: Asset = {
  assetId: usdcAssetId,
  chainId: ethChainId,
  symbol: 'USDC',
  name: 'USD Coin',
  precision: 6,
  icon: 'https://assets.coingecko.com/coins/images/6319/standard/usdc.png',
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

type QrSwapWidgetInnerProps = SwapWidgetProps & {
  apiClient: ReturnType<typeof createApiClient>
}

const QrSwapWidgetCore = ({
  defaultSellAsset = DEFAULT_SELL_ASSET,
  defaultBuyAsset = DEFAULT_BUY_ASSET,
  disabledChainIds = [],
  disabledAssetIds = [],
  allowedChainIds,
  onAssetSelect,
  theme = 'dark',
  defaultSlippage = '0.5',
  showPoweredBy = true,
  apiClient,
}: QrSwapWidgetInnerProps) => {
  const [sellAsset, setSellAsset] = useState<Asset>(defaultSellAsset)
  const [buyAsset, setBuyAsset] = useState<Asset>(defaultBuyAsset)
  const [sellAmount, setSellAmount] = useState('')
  const [selectedRate, setSelectedRate] = useState<TradeRate | null>(null)
  const [slippage, setSlippage] = useState(defaultSlippage)
  const [receiveAddress, setReceiveAddress] = useState('')
  const [showQrCode, setShowQrCode] = useState(false)
  const [quoteData, setQuoteData] = useState<{
    quoteId: string
    depositAddress: string
    qrData: string
  } | null>(null)
  const [isCreatingQuote, setIsCreatingQuote] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [copiedAmount, setCopiedAmount] = useState(false)

  const [tokenModalType, setTokenModalType] = useState<'sell' | 'buy' | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const themeMode: ThemeMode = typeof theme === 'string' ? theme : theme.mode
  const themeConfig = typeof theme === 'object' ? theme : undefined

  const sellAmountBaseUnit = useMemo(
    () => (sellAmount ? parseAmount(sellAmount, sellAsset.precision) : undefined),
    [sellAmount, sellAsset.precision],
  )

  const isSellAssetEvm = getChainType(sellAsset.chainId) === 'evm'

  const {
    data: rates,
    isLoading: isLoadingRates,
    error: ratesError,
  } = useSwapRates(apiClient, {
    sellAssetId: sellAsset.assetId,
    buyAssetId: buyAsset.assetId,
    sellAmountCryptoBaseUnit: sellAmountBaseUnit,
    enabled: !!sellAmountBaseUnit && sellAmountBaseUnit !== '0' && isSellAssetEvm,
  })

  const handleSwapTokens = useCallback(() => {
    const tempSell = sellAsset
    setSellAsset(buyAsset)
    setBuyAsset(tempSell)
    setSellAmount('')
    setSelectedRate(null)
    setShowQrCode(false)
  }, [sellAsset, buyAsset])

  const handleSellAssetSelect = useCallback(
    (asset: Asset) => {
      setSellAsset(asset)
      setSelectedRate(null)
      setShowQrCode(false)
      onAssetSelect?.('sell', asset)
    },
    [onAssetSelect],
  )

  const handleBuyAssetSelect = useCallback(
    (asset: Asset) => {
      setBuyAsset(asset)
      setSelectedRate(null)
      setShowQrCode(false)
      onAssetSelect?.('buy', asset)
    },
    [onAssetSelect],
  )

  const handleCopyAddress = useCallback(() => {
    if (!quoteData?.depositAddress) return
    navigator.clipboard.writeText(quoteData.depositAddress).then(() => {
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    })
  }, [quoteData])

  const handleCopyAmount = useCallback(() => {
    if (!sellAmount) return
    navigator.clipboard.writeText(`${sellAmount} ${sellAsset.symbol}`).then(() => {
      setCopiedAmount(true)
      setTimeout(() => setCopiedAmount(false), 2000)
    })
  }, [sellAmount, sellAsset.symbol])

  const handleGenerateQrCode = useCallback(async () => {
    if (!receiveAddress || !sellAmount || !rates?.length || !sellAmountBaseUnit) return

    const rateToUse = selectedRate ?? rates[0]
    if (!rateToUse) return

    setIsCreatingQuote(true)

    try {
      const response = await fetch('/api/send-swap/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellAssetId: sellAsset.assetId,
          buyAssetId: buyAsset.assetId,
          sellAmountCryptoBaseUnit: sellAmountBaseUnit,
          receiveAddress,
          swapperName: rateToUse.swapperName,
          expectedBuyAmountCryptoBaseUnit: rateToUse.buyAmountCryptoBaseUnit,
          sellAsset: {
            assetId: sellAsset.assetId,
            symbol: sellAsset.symbol,
            name: sellAsset.name,
            precision: sellAsset.precision,
          },
          buyAsset: {
            assetId: buyAsset.assetId,
            symbol: buyAsset.symbol,
            name: buyAsset.name,
            precision: buyAsset.precision,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      setQuoteData({
        quoteId: data.quoteId,
        depositAddress: data.depositAddress,
        qrData: data.qrData,
      })
      setShowQrCode(true)
    } catch (error) {
      console.error('Failed to create quote:', error)
    } finally {
      setIsCreatingQuote(false)
    }
  }, [receiveAddress, sellAmount, sellAmountBaseUnit, rates, selectedRate, sellAsset, buyAsset])

  const { data: sellChainInfo } = useChainInfo(sellAsset.chainId)
  const { data: buyChainInfo } = useChainInfo(buyAsset.chainId)
  const displayRate = selectedRate ?? rates?.[0]
  const buyAmount = displayRate?.buyAmountCryptoBaseUnit

  const assetIdsForPrices = useMemo(
    () => [sellAsset.assetId, buyAsset.assetId],
    [sellAsset.assetId, buyAsset.assetId],
  )
  const { data: marketData } = useMarketData(assetIdsForPrices)
  const sellAssetUsdPrice = marketData?.[sellAsset.assetId]?.price
  const buyAssetUsdPrice = marketData?.[buyAsset.assetId]?.price

  const sellUsdValue = useMemo(() => {
    if (!sellAmountBaseUnit || !sellAssetUsdPrice) return '$0.00'
    return formatUsdValue(sellAmountBaseUnit, sellAsset.precision, sellAssetUsdPrice)
  }, [sellAmountBaseUnit, sellAsset.precision, sellAssetUsdPrice])

  const buyUsdValue = useMemo(() => {
    if (!buyAmount || !buyAssetUsdPrice) return '$0.00'
    return formatUsdValue(buyAmount, buyAsset.precision, buyAssetUsdPrice)
  }, [buyAmount, buyAsset.precision, buyAssetUsdPrice])


  const buttonText = useMemo(() => {
    if (!isSellAssetEvm) return 'Proceed on ShapeShift'
    if (!sellAmount) return 'Enter an amount'
    if (!receiveAddress) return 'Enter receive address'
    if (isLoadingRates) return 'Finding rates...'
    if (ratesError) return 'No routes available'
    if (!rates?.length) return 'No routes found'
    if (isCreatingQuote) return 'Creating Quote...'
    return showQrCode ? 'Update Quote' : 'Generate QR Code'
  }, [
    isSellAssetEvm,
    sellAmount,
    receiveAddress,
    isLoadingRates,
    ratesError,
    rates,
    isCreatingQuote,
    showQrCode,
  ])

  const isButtonDisabled = useMemo(() => {
    if (!isSellAssetEvm) return false
    if (!sellAmount) return true
    if (!receiveAddress) return true
    if (isLoadingRates) return true
    if (isCreatingQuote) return true
    if (ratesError) return true
    if (!rates?.length) return true
    return false
  }, [isSellAssetEvm, sellAmount, receiveAddress, isLoadingRates, isCreatingQuote, ratesError, rates])

  const widgetStyle = useMemo(() => {
    if (!themeConfig) return undefined
    const style: Record<string, string> = {}
    if (themeConfig.accentColor) {
      style['--ssw-accent'] = themeConfig.accentColor
      style['--ssw-accent-light'] = `${themeConfig.accentColor}1a`
    }
    if (themeConfig.backgroundColor) {
      style['--ssw-bg-secondary'] = themeConfig.backgroundColor
      style['--ssw-bg-primary'] = themeConfig.backgroundColor
    }
    if (themeConfig.cardColor) {
      style['--ssw-bg-tertiary'] = themeConfig.cardColor
      style['--ssw-bg-input'] = themeConfig.cardColor
    }
    if (themeConfig.textColor) {
      style['--ssw-text-primary'] = themeConfig.textColor
    }
    if (themeConfig.borderRadius) {
      style['--ssw-border-radius'] = themeConfig.borderRadius
    }
    return Object.keys(style).length > 0 ? (style as React.CSSProperties) : undefined
  }, [themeConfig])

  return (
    <div
      className={`ssw-widget ${themeMode === 'light' ? 'ssw-light' : 'ssw-dark'}`}
      style={widgetStyle}
    >
      <div className='ssw-header'>
        <span className='ssw-header-title'>Swap with QR Code</span>
        <div className='ssw-header-actions'>
          <button
            className='ssw-settings-btn'
            onClick={() => setIsSettingsOpen(true)}
            type='button'
            title='Settings'
          >
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <circle cx='12' cy='12' r='3' />
              <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' />
            </svg>
          </button>
        </div>
      </div>

      <div className='ssw-swap-container'>
        <div className='ssw-token-section ssw-sell'>
          <div className='ssw-section-header'>
            <span className='ssw-section-label'>Sell</span>
          </div>

          <div className='ssw-input-row'>
            <input
              type='text'
              className='ssw-amount-input'
              placeholder='0'
              value={sellAmount}
              onChange={e => {
                setSellAmount(e.target.value.replace(/[^0-9.]/g, ''))
                setSelectedRate(null)
                setShowQrCode(false)
              }}
            />
            <button
              className='ssw-token-btn'
              onClick={() => setTokenModalType('sell')}
              type='button'
            >
              {sellAsset.icon ? (
                <img src={sellAsset.icon} alt={sellAsset.symbol} className='ssw-token-icon' />
              ) : (
                <div className='ssw-token-icon-placeholder'>{sellAsset.symbol.charAt(0)}</div>
              )}
              <div className='ssw-token-info'>
                <span className='ssw-token-symbol'>{sellAsset.symbol}</span>
                <span className='ssw-token-chain'>
                  {sellChainInfo?.name ?? sellAsset.networkName ?? sellAsset.name}
                </span>
              </div>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M9 18l6-6-6-6' />
              </svg>
            </button>
          </div>

          <div className='ssw-section-footer'>
            <span className='ssw-usd-value'>{sellUsdValue}</span>
          </div>
        </div>

        <div className='ssw-swap-divider'>
          <button className='ssw-swap-btn' onClick={handleSwapTokens} type='button'>
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M12 5v14M5 12l7 7 7-7' />
            </svg>
          </button>
        </div>

        <div className='ssw-token-section ssw-buy'>
          <div className='ssw-section-header'>
            <span className='ssw-section-label'>Buy</span>
          </div>

          <div className='ssw-input-row'>
            <input
              type='text'
              className='ssw-amount-input'
              placeholder='0'
              value={buyAmount ? formatAmount(buyAmount, buyAsset.precision) : ''}
              readOnly
            />
            <button
              className='ssw-token-btn'
              onClick={() => setTokenModalType('buy')}
              type='button'
            >
              {buyAsset.icon ? (
                <img src={buyAsset.icon} alt={buyAsset.symbol} className='ssw-token-icon' />
              ) : (
                <div className='ssw-token-icon-placeholder'>{buyAsset.symbol.charAt(0)}</div>
              )}
              <div className='ssw-token-info'>
                <span className='ssw-token-symbol'>{buyAsset.symbol}</span>
                <span className='ssw-token-chain'>
                  {buyChainInfo?.name ?? buyAsset.networkName ?? buyAsset.name}
                </span>
              </div>
              <svg
                width='16'
                height='16'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
              >
                <path d='M9 18l6-6-6-6' />
              </svg>
            </button>
          </div>

          <div className='ssw-section-footer'>
            <span className='ssw-usd-value'>{buyUsdValue}</span>
          </div>
        </div>
      </div>

      <div className='ssw-address-input-section'>
        <label className='ssw-address-label'>Receive Address ({buyAsset.symbol})</label>
        <input
          type='text'
          className='ssw-address-input'
          placeholder={`Enter your ${buyAsset.symbol} address`}
          value={receiveAddress}
          onChange={e => {
            setReceiveAddress(e.target.value)
            setShowQrCode(false)
          }}
        />
      </div>

      {sellAmountBaseUnit && sellAmountBaseUnit !== '0' && (rates?.length || isLoadingRates) && (
        <div className='ssw-quotes'>
          <QuoteSelector
            rates={rates ?? []}
            selectedRate={selectedRate}
            onSelectRate={setSelectedRate}
            buyAsset={buyAsset}
            sellAsset={sellAsset}
            sellAmountBaseUnit={sellAmountBaseUnit}
            isLoading={isLoadingRates}
            buyAssetUsdPrice={buyAssetUsdPrice}
          />
        </div>
      )}

      <button
        className='ssw-action-btn'
        disabled={isButtonDisabled}
        onClick={handleGenerateQrCode}
        type='button'
      >
        {buttonText}
      </button>

      {showQrCode && quoteData && (
        <div className='ssw-qr-section'>
          <div className='ssw-qr-header'>
            <h3 className='ssw-qr-title'>Scan to Send Payment</h3>
            <p className='ssw-qr-subtitle'>
              Send {sellAmount} {sellAsset.symbol} to the deposit address below
            </p>
          </div>
          <div className='ssw-qr-code-container'>
            <QRCodeSVG
              value={quoteData.qrData}
              size={200}
              level='H'
              includeMargin={true}
              bgColor='#ffffff'
              fgColor='#000000'
            />
          </div>
          <div className='ssw-qr-details'>
            <div className='ssw-qr-detail-row'>
              <span className='ssw-qr-detail-label'>Deposit Address:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span className='ssw-qr-detail-value'>{truncateAddress(quoteData.depositAddress)}</span>
                <button
                  onClick={handleCopyAddress}
                  className='ssw-copy-btn-small'
                  type='button'
                  title='Copy address'
                  style={{
                    padding: '4px 8px',
                    background: copiedAddress ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    border: '1px solid var(--ssw-border)',
                    borderRadius: '6px',
                    color: copiedAddress ? '#10b981' : 'var(--ssw-text-secondary)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copiedAddress ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className='ssw-qr-detail-row'>
              <span className='ssw-qr-detail-label'>Amount:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span className='ssw-qr-detail-value'>
                  {sellAmount} {sellAsset.symbol}
                </span>
                <button
                  onClick={handleCopyAmount}
                  className='ssw-copy-btn-small'
                  type='button'
                  title='Copy amount'
                  style={{
                    padding: '4px 8px',
                    background: copiedAmount ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    border: '1px solid var(--ssw-border)',
                    borderRadius: '6px',
                    color: copiedAmount ? '#10b981' : 'var(--ssw-text-secondary)',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copiedAmount ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className='ssw-qr-detail-row'>
              <span className='ssw-qr-detail-label'>You Receive:</span>
              <span className='ssw-qr-detail-value'>
                {buyAmount ? formatAmount(buyAmount, buyAsset.precision) : '0'} {buyAsset.symbol}
              </span>
            </div>
            <div className='ssw-qr-detail-row'>
              <span className='ssw-qr-detail-label'>To Address:</span>
              <span className='ssw-qr-detail-value'>{truncateAddress(receiveAddress)}</span>
            </div>
            <div className='ssw-qr-detail-row'>
              <span className='ssw-qr-detail-label'>Provider:</span>
              <span className='ssw-qr-detail-value'>{displayRate?.swapperName}</span>
            </div>
            <div className='ssw-qr-detail-row' style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--ssw-border)' }}>
              <span className='ssw-qr-detail-label'>QR Data:</span>
              <span className='ssw-qr-detail-value' style={{ fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--ssw-text-muted)' }}>
                {quoteData.qrData}
              </span>
            </div>
          </div>
          <div className='ssw-qr-warning'>
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <circle cx='12' cy='12' r='10' />
              <path d='M12 8v4M12 16h.01' />
            </svg>
            <span>
              Send the exact amount to the deposit address within 30 minutes. The swap will execute automatically once your payment is confirmed.
            </span>
          </div>
        </div>
      )}

      {showPoweredBy && (
        <div className='ssw-powered-by'>
          Powered by{' '}
          <a
            href='https://shapeshift.com'
            target='_blank'
            rel='noopener noreferrer'
            className='ssw-powered-by-link'
          >
            <svg width='16' height='16' viewBox='0 0 57 62' fill='currentColor'>
              <path d='M51.67 5.1L48.97 21.3L39.37 10L51.67 5.1ZM49.03 28.27L51.43 37.14L33.06 42.2L49.03 28.27ZM9.03 23.8L18.88 10.93H35.99L46.92 23.8H9.03ZM45.66 26.99L27.85 42.53L9.7 26.99H45.66ZM15.58 10.01L6.78 21.51L4.08 5.17L15.58 10.01ZM22.57 42.2L4.02 37.15L6.56 28.48L22.57 42.2ZM25.99 46.43L22.49 50.28C19.53 47.46 16.26 44.96 12.78 42.83L25.99 46.43ZM42.98 42.77C39.5 44.94 36.24 47.47 33.29 50.32L29.72 46.42L42.98 42.77ZM55.73 0.06L36.42 7.75H18.42L0 0L4.18 25.3L0.17 38.99L10.65 45.26C15.61 48.23 20.06 51.94 23.86 56.3L27.94 60.97L32.23 56.06C35.9 51.84 40.18 48.22 44.95 45.29L55.23 38.99L51.52 25.31L55.73 0.06Z' />
            </svg>
            ShapeShift
          </a>
        </div>
      )}

      <TokenSelectModal
        isOpen={tokenModalType !== null}
        onClose={() => setTokenModalType(null)}
        onSelect={tokenModalType === 'sell' ? handleSellAssetSelect : handleBuyAssetSelect}
        disabledAssetIds={disabledAssetIds}
        disabledChainIds={disabledChainIds}
        allowedChainIds={allowedChainIds}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        slippage={slippage}
        onSlippageChange={setSlippage}
      />
    </div>
  )
}

export const QrSwapWidget = (props: SwapWidgetProps) => {
  const apiClient = useMemo(
    () => createApiClient({ baseUrl: props.apiBaseUrl, apiKey: props.apiKey }),
    [props.apiBaseUrl, props.apiKey],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <QrSwapWidgetCore {...props} apiClient={apiClient} />
    </QueryClientProvider>
  )
}
