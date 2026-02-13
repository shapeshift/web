import { useMemo } from 'react'

import type { SwapMachineContext, SwapMachineEvent } from '../machines/types'
import type { TradeRate } from '../types'
import { formatAmount, truncateAddress } from '../types'
import { QuoteSelector } from './QuoteSelector'

type InputStepProps = {
  context: SwapMachineContext
  send: (event: SwapMachineEvent) => void
  rates: TradeRate[]
  isLoadingRates: boolean
  ratesError: Error | null
  sellAssetBalance: { balance: string; balanceFormatted: string } | undefined
  buyAssetBalance: { balance: string; balanceFormatted: string } | undefined
  isSellBalanceLoading: boolean
  isBuyBalanceLoading: boolean
  sellUsdValue: string
  buyUsdValue: string
  sellChainInfo: { name: string } | undefined
  buyChainInfo: { name: string } | undefined
  displayRate: TradeRate | undefined
  walletAddress: string | undefined
  bitcoinAddress: string | undefined
  solanaAddress: string | undefined
  defaultReceiveAddress: string | undefined
  buyAssetUsdPrice: string | undefined
  onOpenTokenModal: (type: 'sell' | 'buy') => void
  onOpenAddressModal: () => void
  enableWalletConnection: boolean
  onConnectWallet?: () => void
  bitcoinState: { isLoading: boolean }
  solanaState: { isLoading: boolean }
  isQuoting: boolean
  isExecuting: boolean
  effectiveReceiveAddress: string
  isCustomAddress: boolean
  sellAmount: string
  onSellAmountChange: (value: string) => void
  onSwapTokens: () => void
  onSelectRate: (rate: TradeRate) => void
  onButtonClick: () => void
  sellAmountBaseUnit: string | undefined
}

export const InputStep = ({
  context,
  send: _send,
  rates,
  isLoadingRates,
  ratesError,
  sellAssetBalance,
  buyAssetBalance,
  isSellBalanceLoading,
  isBuyBalanceLoading,
  sellUsdValue,
  buyUsdValue,
  sellChainInfo,
  buyChainInfo,
  displayRate,
  walletAddress,
  bitcoinAddress,
  solanaAddress,
  defaultReceiveAddress,
  buyAssetUsdPrice,
  onOpenTokenModal,
  onOpenAddressModal,
  enableWalletConnection: _enableWalletConnection,
  onConnectWallet: _onConnectWallet,
  bitcoinState,
  solanaState,
  isQuoting,
  isExecuting,
  effectiveReceiveAddress,
  isCustomAddress,
  sellAmount,
  onSellAmountChange,
  onSwapTokens,
  onSelectRate,
  onButtonClick,
  sellAmountBaseUnit,
}: InputStepProps) => {
  const { sellAsset, buyAsset, selectedRate, isSellAssetEvm, isSellAssetUtxo, isSellAssetSolana } =
    context

  const canExecuteDirectly = isSellAssetEvm
  const canExecuteUtxo = isSellAssetUtxo
  const canExecuteSolana = isSellAssetSolana

  const isBitcoinConnected = !!bitcoinAddress
  const isSolanaConnected = !!solanaAddress

  const buyAmount = displayRate?.buyAmountCryptoBaseUnit

  const buttonText = useMemo(() => {
    if (isSellAssetUtxo && canExecuteUtxo) {
      if (!sellAmount) return 'Enter an amount'
      if (!isBitcoinConnected) return 'Connect Bitcoin Wallet'
      if (!effectiveReceiveAddress) return 'Enter receive address'
      if (bitcoinState.isLoading || isExecuting) return 'Executing...'
      if (isLoadingRates) return 'Finding rates...'
      if (ratesError) return 'No routes available'
      if (!rates?.length) return 'No routes found'
      return 'Swap'
    }
    if (isSellAssetSolana && canExecuteSolana) {
      if (!sellAmount) return 'Enter an amount'
      if (!isSolanaConnected) return 'Connect Solana Wallet'
      if (!effectiveReceiveAddress) return 'Enter receive address'
      if (solanaState.isLoading || isExecuting) return 'Executing...'
      if (isLoadingRates) return 'Finding rates...'
      if (ratesError) return 'No routes available'
      if (!rates?.length) return 'No routes found'
      return 'Swap'
    }
    if (!isSellAssetEvm) return 'Proceed on ShapeShift'
    if (!sellAmount) return 'Enter an amount'
    if (!walletAddress && canExecuteDirectly) return 'Connect Wallet'
    if (!effectiveReceiveAddress) return 'Enter receive address'
    if (isLoadingRates) return 'Finding rates...'
    if (ratesError) return 'No routes available'
    if (!rates?.length) return 'No routes found'
    if (isExecuting) return 'Executing...'
    if (!canExecuteDirectly) return 'Proceed on ShapeShift'
    return 'Swap'
  }, [
    walletAddress,
    canExecuteDirectly,
    canExecuteUtxo,
    canExecuteSolana,
    isSellAssetEvm,
    isSellAssetUtxo,
    isSellAssetSolana,
    isBitcoinConnected,
    isSolanaConnected,
    bitcoinState.isLoading,
    solanaState.isLoading,
    sellAmount,
    isLoadingRates,
    ratesError,
    rates,
    isExecuting,
    effectiveReceiveAddress,
  ])

  const isButtonDisabled = useMemo(() => {
    if (!sellAmount || isLoadingRates || ratesError || !rates?.length || isExecuting) {
      return true
    }

    if (!effectiveReceiveAddress) {
      return true
    }

    if (isSellAssetUtxo && canExecuteUtxo) {
      return !isBitcoinConnected || bitcoinState.isLoading
    }

    if (isSellAssetSolana && canExecuteSolana) {
      return !isSolanaConnected || solanaState.isLoading
    }

    if (!isSellAssetEvm) {
      return false
    }

    return false
  }, [
    isSellAssetEvm,
    isSellAssetUtxo,
    isSellAssetSolana,
    canExecuteUtxo,
    canExecuteSolana,
    isBitcoinConnected,
    isSolanaConnected,
    bitcoinState.isLoading,
    solanaState.isLoading,
    sellAmount,
    isLoadingRates,
    ratesError,
    rates,
    isExecuting,
    effectiveReceiveAddress,
  ])

  return (
    <>
      <div className='ssw-swap-container'>
        <div className='ssw-token-section ssw-sell'>
          <div className='ssw-section-header'>
            <span className='ssw-section-label'>Sell</span>
            {walletAddress && isSellAssetEvm && (
              <span className='ssw-wallet-badge'>{truncateAddress(walletAddress)}</span>
            )}
            {bitcoinAddress && isSellAssetUtxo && (
              <span className='ssw-wallet-badge'>{truncateAddress(bitcoinAddress)}</span>
            )}
            {solanaAddress && isSellAssetSolana && (
              <span className='ssw-wallet-badge'>{truncateAddress(solanaAddress)}</span>
            )}
          </div>

          <div className='ssw-input-row'>
            <input
              type='text'
              className='ssw-amount-input'
              placeholder='0'
              value={sellAmount}
              onChange={e => {
                onSellAmountChange(e.target.value.replace(/[^0-9.]/g, ''))
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
            <span className='ssw-usd-value'>{sellUsdValue}</span>
            {(walletAddress || bitcoinAddress || solanaAddress) &&
              (isSellBalanceLoading ? (
                <span className='ssw-balance-skeleton' />
              ) : sellAssetBalance ? (
                <span className='ssw-balance'>Balance: {sellAssetBalance.balanceFormatted}</span>
              ) : null)}
          </div>
        </div>

        <div className='ssw-swap-divider'>
          <button className='ssw-swap-btn' onClick={onSwapTokens} type='button'>
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
            {defaultReceiveAddress ? (
              <span className='ssw-receive-address-btn ssw-receive-address-readonly'>
                <span className='ssw-receive-address-text'>
                  {truncateAddress(defaultReceiveAddress, 4)}
                </span>
              </span>
            ) : (
              <button
                className={`ssw-receive-address-btn ${isCustomAddress ? 'ssw-custom' : ''}`}
                onClick={() => onOpenAddressModal()}
                type='button'
              >
                <span className='ssw-receive-address-text'>
                  {effectiveReceiveAddress
                    ? truncateAddress(effectiveReceiveAddress, 4)
                    : 'Enter address'}
                </span>
                <svg
                  width='12'
                  height='12'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                >
                  <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                  <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                </svg>
              </button>
            )}
          </div>

          <div className='ssw-input-row'>
            <input
              type='text'
              className='ssw-amount-input'
              placeholder='0'
              value={buyAmount ? formatAmount(buyAmount, buyAsset.precision) : ''}
              readOnly
            />
            <button className='ssw-token-btn' onClick={() => onOpenTokenModal('buy')} type='button'>
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
            {(walletAddress || bitcoinAddress || solanaAddress) &&
              (isBuyBalanceLoading ? (
                <span className='ssw-balance-skeleton' />
              ) : buyAssetBalance ? (
                <span className='ssw-balance'>Balance: {buyAssetBalance.balanceFormatted}</span>
              ) : null)}
          </div>
        </div>
      </div>

      {sellAmountBaseUnit && sellAmountBaseUnit !== '0' && (rates?.length || isLoadingRates) && (
        <div className='ssw-quotes'>
          <QuoteSelector
            rates={rates ?? []}
            selectedRate={selectedRate}
            onSelectRate={onSelectRate}
            buyAsset={buyAsset}
            sellAsset={sellAsset}
            sellAmountBaseUnit={sellAmountBaseUnit}
            isLoading={isLoadingRates}
            buyAssetUsdPrice={buyAssetUsdPrice}
          />
        </div>
      )}

      <button
        className={`ssw-action-btn ${!canExecuteDirectly ? 'ssw-secondary' : ''}`}
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
