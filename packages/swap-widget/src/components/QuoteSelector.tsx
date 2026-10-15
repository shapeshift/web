import './QuoteSelector.css'

import { useCallback, useState } from 'react'

import { getSwapperColor, getSwapperIcon } from '../constants/swappers'
import { formatUsdValue } from '../hooks/useMarketData'
import type { Asset, TradeRate } from '../types'
import { formatAmount } from '../types'
import { getRateAmountBaseUnit } from '../utils/rateDisplay'
import { QuotesModal } from './QuotesModal'

type QuoteSelectorProps = {
  rates: TradeRate[]
  activeRate: TradeRate | undefined
  onSelectRate: (rate: TradeRate) => void
  buyAsset: Asset
  sellAsset: Asset
  sellAmountBaseUnit: string
  buyAmountBaseUnit: string
  isExactOutput: boolean
  isLoading: boolean
  sellAssetUsdPrice?: string
  buyAssetUsdPrice?: string
}

export const QuoteSelector = ({
  rates,
  activeRate,
  onSelectRate,
  buyAsset,
  sellAsset,
  sellAmountBaseUnit,
  buyAmountBaseUnit,
  isExactOutput,
  isLoading,
  sellAssetUsdPrice,
  buyAssetUsdPrice,
}: QuoteSelectorProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const bestRate = rates[0]

  const hasMultipleRates = rates.length > 1

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const handleSelectRate = useCallback(
    (rate: TradeRate) => {
      onSelectRate(rate)
    },
    [onSelectRate],
  )

  if (isLoading) {
    return (
      <div className='ssw-quote-selector ssw-loading'>
        <div className='ssw-quote-loading'>
          <div className='ssw-spinner-small' />
          <span>Finding best rates…</span>
        </div>
      </div>
    )
  }

  if (!activeRate) {
    return null
  }

  const swapperIcon = getSwapperIcon(activeRate.swapperName)
  const swapperColor = getSwapperColor(activeRate.swapperName)

  const asset = isExactOutput ? sellAsset : buyAsset
  const amountBaseUnit = getRateAmountBaseUnit(activeRate, isExactOutput)
  const formattedAmount = formatAmount(amountBaseUnit, asset.precision)
  const usdValue = formatUsdValue(
    amountBaseUnit,
    asset.precision,
    isExactOutput ? sellAssetUsdPrice : buyAssetUsdPrice,
  )

  return (
    <>
      <button
        className={`ssw-quote-selector ${hasMultipleRates ? '' : 'ssw-single'}`}
        onClick={handleOpenModal}
        disabled={!hasMultipleRates}
        type='button'
      >
        <div className='ssw-quote-left'>
          <div className='ssw-quote-provider'>
            {swapperIcon ? (
              <img
                src={swapperIcon}
                alt={activeRate.swapperName}
                className='ssw-quote-provider-icon'
              />
            ) : (
              <div
                className='ssw-quote-provider-icon-placeholder'
                style={{ backgroundColor: swapperColor }}
              >
                {activeRate.swapperName.charAt(0)}
              </div>
            )}
            <span className='ssw-quote-provider-name'>{activeRate.swapperName}</span>
            {activeRate === bestRate && <span className='ssw-quote-best-tag'>Best</span>}
          </div>
          <span className='ssw-quote-usd'>{usdValue}</span>
        </div>

        <div className='ssw-quote-right'>
          <div className='ssw-quote-amount-row'>
            <span className='ssw-quote-amount'>{formattedAmount}</span>
            <span className='ssw-quote-symbol'>{asset.symbol}</span>
          </div>
          {hasMultipleRates && (
            <span className='ssw-quote-more'>
              +{rates.length - 1} more
              <svg
                width='12'
                height='12'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2.5'
              >
                <path d='M9 18l6-6-6-6' />
              </svg>
            </span>
          )}
        </div>
      </button>

      <QuotesModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        rates={rates}
        selectedRate={activeRate}
        onSelectRate={handleSelectRate}
        buyAsset={buyAsset}
        sellAsset={sellAsset}
        sellAmountBaseUnit={sellAmountBaseUnit}
        buyAmountBaseUnit={buyAmountBaseUnit}
        isExactOutput={isExactOutput}
        sellAssetUsdPrice={sellAssetUsdPrice}
        buyAssetUsdPrice={buyAssetUsdPrice}
      />
    </>
  )
}
