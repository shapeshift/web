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
    rates,
    isLoadingRates,
    ratesError,
    sellAssetBalance,
    buyAssetBalance,
    isSellBalanceLoading,
    isBuyBalanceLoading,
    sellUsdValue,
    sellAssetUsdPrice,
    buyUsdValue,
    sellChainInfo,
    buyChainInfo,
    buyAmount,
    buyAssetUsdPrice,
    networkFeeDisplay,
    sellBalanceFiatValue,
    buyBalanceFiatValue,
    isExactOutput,
    effectiveSellAmountBaseUnit,
  } = displayValues

  const {
    sendAddress,
    receiveAddress,
    isReceiveAddressResolving,
    setCustomReceiveAddress,
    evm,
    bitcoin,
    solana,
  } = useSwapWallet()

  const {
    sellAsset,
    buyAsset,
    selectedRate,
    sellAmount,
    sellAmountBaseUnit,
    isSellAmountFiat,
    sellAmountFiat,
    isSellAssetEvm,
    isSellAssetUtxo,
    isSellAssetSolana,
    buyAmount: buyAmountInput,
    buyAmountBaseUnit,
  } = context

  const buyChainId = buyAsset.chainId
  const hasAnyWalletAddress = !!evm.address || !!bitcoin.address || !!solana.address
  const hasActiveWallet = !!receiveAddress || hasAnyWalletAddress || isReceiveAddressResolving

  const isUnsupportedChain = !isSellAssetEvm && !isSellAssetUtxo && !isSellAssetSolana

  const drivingAmountBaseUnit = isExactOutput ? buyAmountBaseUnit : sellAmountBaseUnit

  // A locked buy amount is the only thing that takes the sell side out of the user's hands
  const isSellAmountReadOnly = isExactOutput && isBuyAmountLocked

  // Whichever side is derived has nothing to show until a route prices it
  const isSellAmountPending = isExactOutput && isLoadingRates
  const isBuyAmountPending = !isExactOutput && isLoadingRates

  // The sell side reads the same either way - the user's entry, or the route's input once the buy
  // side is driving. The fiat toggle picks the unit for both
  const sellAmountCrypto = effectiveSellAmountBaseUnit
    ? formatAmount(effectiveSellAmountBaseUnit, sellAsset.precision, 6)
    : ''

  const sellAmountValue = (() => {
    if (!isExactOutput) return isSellAmountFiat ? sellAmountFiat : sellAmount
    if (!isSellAmountFiat) return sellAmountCrypto

    return sellAssetUsdPrice
      ? cryptoToFiat(effectiveSellAmountBaseUnit, sellAssetUsdPrice, sellAsset.precision)
      : ''
  })()

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
    const drivingAmount = isExactOutput ? buyAmountBaseUnit : sellAmount
    if (!drivingAmount || drivingAmount === '0') return { text: 'Enter an amount', disabled: true }
    if (isLoadingRates) return { text: 'Finding rates...', disabled: true }
    if (ratesError) return { text: 'No routes available', disabled: true }
    if (!rates?.length) return { text: 'No routes found', disabled: true }
    return { text: 'Swap', disabled: false }
  }, [
    isUnsupportedChain,
    allowShapeshiftRedirect,
    sendAddress,
    receiveAddress,
    sellAmount,
    isExactOutput,
    buyAmountBaseUnit,
    isLoadingRates,
    ratesError,
    rates,
  ])

  return (
    <>
      <div className='ssw-swap-container'>
        <div className='ssw-token-section ssw-sell'>
          <div className='ssw-section-header'>
            <span className='ssw-section-label'>Sell</span>
          </div>

          <div className='ssw-input-row'>
            {isSellAmountFiat && <span className='ssw-fiat-prefix'>$</span>}
            <input
              type='text'
              className={`ssw-amount-input${isSellAmountReadOnly ? ' ssw-amount-input-locked' : ''}${
                isSellAmountPending ? ' ssw-amount-input-pending' : ''
              }`}
              placeholder={isSellAmountPending ? '...' : '0'}
              // Shows the route's input until the user types, which hands the trade back to this side
              value={sellAmountValue}
              // Typing would clear the locked buy amount, so the derived figure is all there is
              readOnly={isSellAmountReadOnly}
              onChange={e => {
                const raw = e.target.value.replace(/[^0-9.]/g, '')
                const parts = raw.split('.')
                const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw
                onSellAmountChange(sanitized, sellAssetUsdPrice)
              }}
            />
            <button
              className='ssw-token-btn'
              onClick={() => onOpenTokenModal('sell')}
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
            {!sellAssetUsdPrice ? (
              <span className='ssw-usd-value' />
            ) : (
              <button
                type='button'
                className='ssw-usd-value ssw-usd-value-toggle'
                onClick={() => onToggleSellFiat(sellAssetUsdPrice)}
              >
                <span>
                  {isSellAmountFiat
                    ? `≈ ${sellAmountCrypto || '0'} ${sellAsset.symbol}`
                    : sellUsdValue}
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
              (isSellBalanceLoading ? (
                <span className='ssw-balance-skeleton' />
              ) : sellAssetBalance ? (
                <span className='ssw-balance'>
                  Balance: {sellAssetBalance.balanceFormatted}
                  {sellBalanceFiatValue && (
                    <span className='ssw-balance-fiat'> ({sellBalanceFiatValue})</span>
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
              // Falls back to the route's output whenever the user isn't driving the buy side
              value={
                isExactOutput
                  ? buyAmountInput
                  : buyAmount
                    ? formatAmount(buyAmount, buyAsset.precision)
                    : ''
              }
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
            <span className='ssw-usd-value'>{buyUsdValue}</span>
            {hasAnyWalletAddress &&
              (isBuyBalanceLoading ? (
                <span className='ssw-balance-skeleton' />
              ) : buyAssetBalance ? (
                <span className='ssw-balance'>
                  Balance: {buyAssetBalance.balanceFormatted}
                  {buyBalanceFiatValue && (
                    <span className='ssw-balance-fiat'> ({buyBalanceFiatValue})</span>
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

      {drivingAmountBaseUnit &&
        drivingAmountBaseUnit !== '0' &&
        (rates?.length || isLoadingRates) && (
          <div className='ssw-quotes'>
            <QuoteSelector
              rates={rates ?? []}
              selectedRate={selectedRate}
              onSelectRate={onSelectRate}
              buyAsset={buyAsset}
              sellAsset={sellAsset}
              sellAmountBaseUnit={effectiveSellAmountBaseUnit ?? '0'}
              buyAmountBaseUnit={buyAmountBaseUnit ?? '0'}
              isExactOutput={isExactOutput}
              isLoading={isLoadingRates}
              sellAssetUsdPrice={sellAssetUsdPrice}
              buyAssetUsdPrice={buyAssetUsdPrice}
            />
          </div>
        )}

      {networkFeeDisplay && (
        <div className='ssw-network-fee'>
          <span className='ssw-network-fee-label'>Est. network fee</span>
          <span className='ssw-network-fee-value'>{networkFeeDisplay}</span>
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
