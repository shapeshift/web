import { useMemo } from 'react'

import { useSwapWallet } from '../contexts/SwapWalletContext'
import type { SwapDisplayValues } from '../hooks/useSwapDisplayValues'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import type { TradeRate } from '../types'
import { formatAmount } from '../types'
import { cryptoToFiat } from '../utils/fiatConversion'
import { QuoteSelector } from './QuoteSelector'
import { ReceiveAddressRow } from './ReceiveAddressRow'

type InputStepProps = {
  displayValues: SwapDisplayValues
  onOpenTokenModal: (type: 'sell' | 'buy') => void
  onSellAmountChange: (value: string, sellAssetUsdPrice?: string) => void
  onBuyAmountChange: (value: string) => void
  onToggleSellFiat: (sellAssetUsdPrice?: string) => void
  onSwapTokens: () => void
  onSelectRate: (rate: TradeRate) => void
  onButtonClick: () => void
  isBuyAssetLocked: boolean
  isBuyAmountLocked: boolean
  isReceiveAddressLocked: boolean
  allowShapeshiftRedirect: boolean
}

export const InputStep = ({
  displayValues,
  onOpenTokenModal,
  onSellAmountChange,
  onBuyAmountChange,
  onToggleSellFiat,
  onSwapTokens,
  onSelectRate,
  onButtonClick,
  isBuyAssetLocked,
  isBuyAmountLocked,
  isReceiveAddressLocked,
  allowShapeshiftRedirect,
}: InputStepProps) => {
  const context = SwapMachineCtx.useSelector(s => s.context)
  const isQuoting = SwapMachineCtx.useSelector(s => s.matches('quoting'))

  const {
    sendAddress,
    receiveAddress,
    isReceiveAddressResolving,
    setCustomReceiveAddress,
    evm,
    bitcoin,
    solana,
  } = useSwapWallet()

  const buyChainId = context.buyAsset.chainId
  const hasAnyWalletAddress = !!evm.address || !!bitcoin.address || !!solana.address
  const hasActiveWallet = !!receiveAddress || hasAnyWalletAddress || isReceiveAddressResolving

  const isUnsupportedChain =
    !context.isSellAssetEvm && !context.isSellAssetUtxo && !context.isSellAssetSolana

  const amountBaseUnit = displayValues.isExactOutput
    ? context.buyAmountBaseUnit
    : context.sellAmountBaseUnit

  const isSellAmountReadOnly = displayValues.isExactOutput && isBuyAmountLocked
  const isSellAmountPending = displayValues.isExactOutput && displayValues.isLoadingRates
  const isBuyAmountPending = !displayValues.isExactOutput && displayValues.isLoadingRates

  const sellAmountCrypto = useMemo(
    () =>
      displayValues.sellAmountBaseUnit
        ? formatAmount(displayValues.sellAmountBaseUnit, context.sellAsset.precision, 6)
        : '',
    [displayValues.sellAmountBaseUnit, context.sellAsset.precision],
  )

  const buyAmountValue = useMemo(() => {
    if (displayValues.isExactOutput) return context.buyAmount
    if (!displayValues.buyAmount) return ''

    return formatAmount(displayValues.buyAmount, context.buyAsset.precision)
  }, [
    displayValues.isExactOutput,
    displayValues.buyAmount,
    context.buyAmount,
    context.buyAsset.precision,
  ])

  const sellAmountValue = useMemo(() => {
    if (!displayValues.isExactOutput) {
      return context.isSellAmountFiat ? context.sellAmountFiat : context.sellAmount
    }

    if (!context.isSellAmountFiat) return sellAmountCrypto

    return cryptoToFiat(
      displayValues.sellAmountBaseUnit,
      displayValues.sellAssetUsdPrice ?? '',
      context.sellAsset.precision,
    )
  }, [
    displayValues.isExactOutput,
    displayValues.sellAmountBaseUnit,
    displayValues.sellAssetUsdPrice,
    context.isSellAmountFiat,
    context.sellAmountFiat,
    context.sellAmount,
    context.sellAsset.precision,
    sellAmountCrypto,
  ])

  const { text: buttonText, disabled: isButtonDisabled } = useMemo((): {
    text: string
    disabled: boolean
  } => {
    if (isUnsupportedChain) {
      if (!allowShapeshiftRedirect) return { text: 'Route not supported', disabled: true }
      return { text: 'Proceed on ShapeShift', disabled: false }
    }

    if (!sendAddress) return { text: 'Connect Wallet', disabled: false }
    if (!receiveAddress) return { text: 'Enter receive address', disabled: true }

    const drivingAmount = displayValues.isExactOutput
      ? context.buyAmountBaseUnit
      : context.sellAmount

    if (!drivingAmount || drivingAmount === '0') return { text: 'Enter an amount', disabled: true }
    if (displayValues.isLoadingRates) return { text: 'Finding rates...', disabled: true }
    if (displayValues.ratesError) return { text: 'No routes available', disabled: true }
    if (!displayValues.rates?.length) return { text: 'No routes found', disabled: true }

    return { text: 'Swap', disabled: false }
  }, [
    isUnsupportedChain,
    allowShapeshiftRedirect,
    sendAddress,
    receiveAddress,
    context.sellAmount,
    displayValues.isExactOutput,
    context.buyAmountBaseUnit,
    displayValues.isLoadingRates,
    displayValues.ratesError,
    displayValues.rates,
  ])

  return (
    <>
      <div className='ssw-swap-container'>
        <div className='ssw-token-section ssw-sell'>
          <div className='ssw-section-header'>
            <span className='ssw-section-label'>Sell</span>
          </div>

          <div className='ssw-input-row'>
            {context.isSellAmountFiat && <span className='ssw-fiat-prefix'>$</span>}
            <input
              type='text'
              className={`ssw-amount-input${
                isSellAmountReadOnly ? ' ssw-amount-input-locked' : ''
              }${isSellAmountPending ? ' ssw-amount-input-pending' : ''}`}
              placeholder={isSellAmountPending ? '...' : '0'}
              value={sellAmountValue}
              readOnly={isSellAmountReadOnly}
              onChange={e => {
                const raw = e.target.value.replace(/[^0-9.]/g, '')
                const parts = raw.split('.')
                const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw
                onSellAmountChange(sanitized, displayValues.sellAssetUsdPrice)
              }}
            />
            <button
              className='ssw-token-btn'
              onClick={() => onOpenTokenModal('sell')}
              type='button'
            >
              {context.sellAsset.icon ? (
                <img
                  src={context.sellAsset.icon}
                  alt={context.sellAsset.symbol}
                  className='ssw-token-icon'
                />
              ) : (
                <div className='ssw-token-icon-placeholder'>
                  {context.sellAsset.symbol.charAt(0)}
                </div>
              )}
              <div className='ssw-token-info'>
                <span className='ssw-token-symbol'>{context.sellAsset.symbol}</span>
                <span className='ssw-token-chain'>
                  {displayValues.sellChainInfo?.name ??
                    context.sellAsset.networkName ??
                    context.sellAsset.name}
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
            {!displayValues.sellAssetUsdPrice ? (
              <span className='ssw-usd-value' />
            ) : (
              <button
                type='button'
                className='ssw-usd-value ssw-usd-value-toggle'
                onClick={() => onToggleSellFiat(displayValues.sellAssetUsdPrice)}
              >
                <span>
                  {context.isSellAmountFiat
                    ? `≈ ${sellAmountCrypto || '0'} ${context.sellAsset.symbol}`
                    : displayValues.sellUsdValue}
                </span>
                <svg
                  width='12'
                  height='12'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  aria-hidden='true'
                >
                  <path d='M7 16V4M7 4L3 8M7 4l4 4M17 8v12M17 20l4-4M17 20l-4-4' />
                </svg>
              </button>
            )}
            {hasAnyWalletAddress &&
              (displayValues.isSellBalanceLoading ? (
                <span className='ssw-balance-skeleton' />
              ) : displayValues.sellAssetBalance ? (
                <span className='ssw-balance'>
                  Balance: {displayValues.sellAssetBalance.balanceFormatted}
                  {displayValues.sellBalanceFiatValue && (
                    <span className='ssw-balance-fiat'>
                      {' '}
                      ({displayValues.sellBalanceFiatValue})
                    </span>
                  )}
                </span>
              ) : null)}
          </div>
        </div>

        <div className='ssw-swap-divider'>
          <button
            className='ssw-swap-btn'
            onClick={isBuyAssetLocked ? undefined : onSwapTokens}
            disabled={isBuyAssetLocked}
            type='button'
          >
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
              className={`ssw-amount-input${isBuyAmountLocked ? ' ssw-amount-input-locked' : ''}${
                isBuyAmountPending ? ' ssw-amount-input-pending' : ''
              }`}
              placeholder={isBuyAmountPending ? '...' : '0'}
              value={buyAmountValue}
              readOnly={isBuyAmountLocked}
              onChange={e => {
                const raw = e.target.value.replace(/[^0-9.]/g, '')
                const parts = raw.split('.')
                onBuyAmountChange(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw)
              }}
            />
            <button
              className={`ssw-token-btn${isBuyAssetLocked ? ' ssw-token-btn-locked' : ''}`}
              onClick={isBuyAssetLocked ? undefined : () => onOpenTokenModal('buy')}
              disabled={isBuyAssetLocked}
              type='button'
            >
              {context.buyAsset.icon ? (
                <img
                  src={context.buyAsset.icon}
                  alt={context.buyAsset.symbol}
                  className='ssw-token-icon'
                />
              ) : (
                <div className='ssw-token-icon-placeholder'>
                  {context.buyAsset.symbol.charAt(0)}
                </div>
              )}
              <div className='ssw-token-info'>
                <span className='ssw-token-symbol'>{context.buyAsset.symbol}</span>
                <span className='ssw-token-chain'>
                  {displayValues.buyChainInfo?.name ??
                    context.buyAsset.networkName ??
                    context.buyAsset.name}
                </span>
              </div>
              {!isBuyAssetLocked && (
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
              )}
            </button>
          </div>

          <div className='ssw-section-footer'>
            <span className='ssw-usd-value'>{displayValues.buyUsdValue}</span>
            {hasAnyWalletAddress &&
              (displayValues.isBuyBalanceLoading ? (
                <span className='ssw-balance-skeleton' />
              ) : displayValues.buyAssetBalance ? (
                <span className='ssw-balance'>
                  Balance: {displayValues.buyAssetBalance.balanceFormatted}
                  {displayValues.buyBalanceFiatValue && (
                    <span className='ssw-balance-fiat'> ({displayValues.buyBalanceFiatValue})</span>
                  )}
                </span>
              ) : null)}
          </div>
        </div>

        {!isUnsupportedChain && hasActiveWallet && (
          <ReceiveAddressRow
            receiveAddress={receiveAddress}
            isResolving={isReceiveAddressResolving}
            buyChainId={buyChainId}
            isLocked={isReceiveAddressLocked}
            onSetCustomReceiveAddress={setCustomReceiveAddress}
          />
        )}
      </div>

      {amountBaseUnit &&
        amountBaseUnit !== '0' &&
        (displayValues.rates?.length || displayValues.isLoadingRates) && (
          <div className='ssw-quotes'>
            <QuoteSelector
              rates={displayValues.rates ?? []}
              selectedRate={context.selectedRate}
              onSelectRate={onSelectRate}
              buyAsset={context.buyAsset}
              sellAsset={context.sellAsset}
              sellAmountBaseUnit={displayValues.sellAmountBaseUnit ?? '0'}
              buyAmountBaseUnit={context.buyAmountBaseUnit ?? '0'}
              isExactOutput={displayValues.isExactOutput}
              isLoading={displayValues.isLoadingRates}
              sellAssetUsdPrice={displayValues.sellAssetUsdPrice}
              buyAssetUsdPrice={displayValues.buyAssetUsdPrice}
            />
          </div>
        )}

      {displayValues.networkFeeDisplay && (
        <div className='ssw-network-fee'>
          <span className='ssw-network-fee-label'>Est. network fee</span>
          <span className='ssw-network-fee-value'>{displayValues.networkFeeDisplay}</span>
        </div>
      )}

      <button
        className={`ssw-action-btn ${isUnsupportedChain ? 'ssw-secondary' : ''}`}
        disabled={isButtonDisabled || isQuoting}
        onClick={onButtonClick}
        type='button'
        style={isQuoting ? { opacity: 0.7 } : undefined}
      >
        {isQuoting ? (
          <>
            <svg
              className='ssw-spinner'
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '6px' }}
            >
              <circle cx='12' cy='12' r='10' opacity='0.25' />
              <path d='M12 2a10 10 0 0 1 10 10' />
            </svg>
            Fetching Quote…
          </>
        ) : (
          buttonText
        )}
      </button>
    </>
  )
}
