import './QuotesModal.css'

import { useCallback, useEffect, useMemo } from 'react'

import { getSwapperColor, getSwapperIcon } from '../constants/swappers'
import { formatUsdValue } from '../hooks/useMarketData'
import type { Asset, TradeRate } from '../types'
import { formatAmount } from '../types'
import { getRateAmountBaseUnit, getRatePenaltyPercent, sortRatesByValue } from '../utils/rateDisplay'

const useLockBodyScroll = (isLocked: boolean) => {
  useEffect(() => {
    if (!isLocked) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isLocked])
}

type QuotesModalProps = {
  isOpen: boolean
  onClose: () => void
  rates: TradeRate[]
  selectedRate: TradeRate | null
  onSelectRate: (rate: TradeRate) => void
  buyAsset: Asset
  sellAsset: Asset
  sellAmountBaseUnit: string
  buyAmountBaseUnit: string
  isExactOutput: boolean
  sellAssetUsdPrice?: string
  buyAssetUsdPrice?: string
}

export const QuotesModal = ({
  isOpen,
  onClose,
  rates,
  selectedRate,
  onSelectRate,
  buyAsset,
  sellAsset,
  sellAmountBaseUnit,
  buyAmountBaseUnit,
  isExactOutput,
  sellAssetUsdPrice,
  buyAssetUsdPrice,
}: QuotesModalProps) => {
  useLockBodyScroll(isOpen)

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose()
      }
    },
    [onClose],
  )

  const handleSelectRate = useCallback(
    (rate: TradeRate) => {
      onSelectRate(rate)
      onClose()
    },
    [onSelectRate, onClose],
  )

  const sortedRates = useMemo(
    () => sortRatesByValue(rates, isExactOutput),
    [rates, isExactOutput],
  )

  const bestRate = useMemo(() => sortedRates[0], [sortedRates])
  const bestAmountBaseUnit = bestRate ? getRateAmountBaseUnit(bestRate, isExactOutput) : '0'

  // The side that varies is the one worth showing per route
  const varyingAsset = isExactOutput ? sellAsset : buyAsset
  const varyingUsdPrice = isExactOutput ? sellAssetUsdPrice : buyAssetUsdPrice

  if (!isOpen) return null

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      className='ssw-quotes-modal-backdrop'
      onClick={handleBackdropClick}
      onKeyDown={e => e.key === 'Escape' && onClose()}
      role='dialog'
      aria-modal='true'
      aria-labelledby='quotes-modal-title'
    >
      <div className='ssw-quotes-modal'>
        <div className='ssw-quotes-modal-header'>
          <div className='ssw-quotes-header-content'>
            <h2 id='quotes-modal-title' className='ssw-quotes-modal-title'>
              Select Route
            </h2>
            <span className='ssw-quotes-modal-subtitle'>
              {isExactOutput ? (
                <>
                  {sellAsset.symbol} → {formatAmount(buyAmountBaseUnit, buyAsset.precision)}{' '}
                  {buyAsset.symbol}
                </>
              ) : (
                <>
                  {formatAmount(sellAmountBaseUnit, sellAsset.precision)} {sellAsset.symbol} →{' '}
                  {buyAsset.symbol}
                </>
              )}
            </span>
          </div>
          <button className='ssw-quotes-modal-close' onClick={onClose} type='button'>
            <svg
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
            >
              <path d='M18 6L6 18M6 6l12 12' />
            </svg>
          </button>
        </div>

        <div className='ssw-quotes-modal-list'>
          {sortedRates.map((rate, index) => {
            const amountBaseUnit = getRateAmountBaseUnit(rate, isExactOutput)
            const estimatedTime = rate.estimatedExecutionTimeMs
            const isBest = index === 0
            const isSelected = selectedRate?.id === rate.id
            const swapperIcon = getSwapperIcon(rate.swapperName)
            const swapperColor = getSwapperColor(rate.swapperName)
            const formattedAmount = formatAmount(amountBaseUnit, varyingAsset.precision)
            const usdValue = formatUsdValue(amountBaseUnit, varyingAsset.precision, varyingUsdPrice)
            const penaltyPercent = isBest
              ? null
              : getRatePenaltyPercent(bestAmountBaseUnit, amountBaseUnit, isExactOutput)
            const estimatedSeconds = estimatedTime ? Math.round(estimatedTime / 1000) : 0
            const hasTime = estimatedSeconds > 0

            return (
              <button
                key={rate.id}
                className={`ssw-quote-row ${isSelected ? 'ssw-selected' : ''} ${
                  isBest ? 'ssw-best' : ''
                }`}
                onClick={() => handleSelectRate(rate)}
                type='button'
              >
                <div className='ssw-quote-row-left'>
                  {swapperIcon ? (
                    <img src={swapperIcon} alt={rate.swapperName} className='ssw-quote-row-icon' />
                  ) : (
                    <div
                      className='ssw-quote-row-icon-placeholder'
                      style={{ backgroundColor: swapperColor }}
                    >
                      {rate.swapperName.charAt(0)}
                    </div>
                  )}
                  <div className='ssw-quote-row-info'>
                    <div className='ssw-quote-row-name-row'>
                      <span className='ssw-quote-row-name'>{rate.swapperName}</span>
                      {isBest && <span className='ssw-quote-row-best'>Best</span>}
                      {penaltyPercent && (
                        <span className='ssw-quote-row-diff'>
                          {isExactOutput ? '+' : '-'}
                          {penaltyPercent}%
                        </span>
                      )}
                    </div>
                    {hasTime && <span className='ssw-quote-row-time'>~{estimatedSeconds}s</span>}
                  </div>
                </div>

                <div className='ssw-quote-row-right'>
                  <span className='ssw-quote-row-amount'>
                    {formattedAmount}{' '}
                    <span className='ssw-quote-row-symbol'>{varyingAsset.symbol}</span>
                  </span>
                  <span className='ssw-quote-row-usd'>{usdValue}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
