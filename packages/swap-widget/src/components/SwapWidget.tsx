import './SwapWidget.css'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { WalletClient } from 'viem'

import { createApiClient } from '../api/client'
import { DEFAULT_BUY_ASSET, DEFAULT_SELL_ASSET } from '../constants/defaults'
import type { SwapWalletContextValue } from '../contexts/SwapWalletContext'
import { SwapWalletProvider, useSwapWallet } from '../contexts/SwapWalletContext'
import { useBitcoinSigning } from '../hooks/useBitcoinSigning'
import { useSolanaSigning } from '../hooks/useSolanaSigning'
import { useStatusPolling } from '../hooks/useStatusPolling'
import { useSwapApproval } from '../hooks/useSwapApproval'
import { useSwapDisplayValues } from '../hooks/useSwapDisplayValues'
import { useSwapExecution } from '../hooks/useSwapExecution'
import { useSwapHandlers } from '../hooks/useSwapHandlers'
import { useSwapQuoting } from '../hooks/useSwapQuoting'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import type { Asset, SwapWidgetProps, ThemeMode } from '../types'
import { getChainType } from '../types'
import { AddressInputModal } from './AddressInputModal'
import { ApprovalStep } from './ApprovalStep'
import { ExecutionStep } from './ExecutionStep'
import { InputStep } from './InputStep'
import { SettingsModal } from './SettingsModal'
import { StatusStep } from './StatusStep'
import { TokenSelectModal } from './TokenSelectModal'
import { ConnectWalletButton, InternalWalletProvider } from './WalletProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

type SwapWidgetContentProps = {
  apiClient: ReturnType<typeof createApiClient>
  theme: SwapWidgetProps['theme']
  showPoweredBy: boolean
  defaultReceiveAddress?: string
  affiliateAddress?: string
  enableWalletConnection: boolean
  isBuyAssetLocked: boolean
  onConnectWallet?: () => void
  onSwapSuccess?: (txHash: string) => void
  onSwapError?: (error: Error) => void
  onAssetSelect?: (type: 'sell' | 'buy', asset: Asset) => void
  sellDisabledAssetIds: string[]
  buyDisabledAssetIds: string[]
  sellDisabledChainIds: string[]
  buyDisabledChainIds: string[]
  sellAllowedChainIds?: string[]
  buyAllowedChainIds?: string[]
  sellAllowedAssetIds?: string[]
  buyAllowedAssetIds?: string[]
}

const SwapWidgetContent = ({
  apiClient,
  theme = 'dark',
  showPoweredBy,
  defaultReceiveAddress,
  affiliateAddress,
  enableWalletConnection,
  isBuyAssetLocked,
  onConnectWallet,
  onSwapSuccess,
  onSwapError,
  onAssetSelect,
  sellDisabledAssetIds,
  buyDisabledAssetIds,
  sellDisabledChainIds,
  buyDisabledChainIds,
  sellAllowedChainIds,
  buyAllowedChainIds,
  sellAllowedAssetIds,
  buyAllowedAssetIds,
}: SwapWidgetContentProps) => {
  const state = SwapMachineCtx.useSelector(s => s)
  const actorRef = SwapMachineCtx.useActorRef()

  const {
    walletAddress,
    effectiveReceiveAddress,
    isCustomAddress,
    customReceiveAddress,
    setCustomReceiveAddress,
    bitcoin,
    solana,
  } = useSwapWallet()

  const [tokenModalType, setTokenModalType] = useState<'sell' | 'buy' | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)

  const themeMode: ThemeMode = typeof theme === 'string' ? theme : theme.mode
  const themeConfig = typeof theme === 'object' ? theme : undefined

  const buyChainType = getChainType(state.context.buyAsset.chainId)

  const {
    rates,
    isLoadingRates,
    ratesError,
    sellAssetBalance,
    isSellBalanceLoading,
    refetchSellBalance,
    buyAssetBalance,
    isBuyBalanceLoading,
    refetchBuyBalance,
    sellChainInfo,
    buyChainInfo,
    displayRate,
    networkFeeDisplay,
    sellUsdValue,
    buyUsdValue,
    buyAssetUsdPrice,
    sellBalanceFiatValue,
    buyBalanceFiatValue,
  } = useSwapDisplayValues({ apiClient })

  const {
    handleSwapTokens,
    handleSellAssetSelect,
    handleBuyAssetSelect,
    handleSellAmountChange,
    handleSelectRate,
    handleSlippageChange,
    handleButtonClick,
  } = useSwapHandlers({ onConnectWallet, onAssetSelect, affiliateAddress })

  useSwapQuoting({ apiClient, rates, sellAssetBalance })

  useSwapApproval()

  useSwapExecution()

  useStatusPolling({ onSwapSuccess, onSwapError, refetchSellBalance, refetchBuyBalance })

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
    }
    if (themeConfig.textColor) {
      style['--ssw-text-primary'] = themeConfig.textColor
    }
    if (themeConfig.borderRadius) {
      const base = parseFloat(themeConfig.borderRadius) || 0
      style['--ssw-radius-widget'] = `${base * 1.25}px`
      style['--ssw-radius-lg'] = `${base}px`
      style['--ssw-radius-md'] = `${Math.round(base * 0.875)}px`
      style['--ssw-radius-sm'] = `${Math.round(base * 0.625)}px`
      style['--ssw-radius-xs'] = `${Math.round(base * 0.375)}px`
      style['--ssw-radius-2xs'] = `${Math.round(base * 0.25)}px`
    }
    if (themeConfig.fontFamily) {
      style['--ssw-font-family'] = themeConfig.fontFamily
    }
    if (themeConfig.borderColor) {
      style['--ssw-border'] = themeConfig.borderColor
      style['--ssw-border-hover'] = themeConfig.borderColor
    }
    if (themeConfig.secondaryTextColor) {
      style['--ssw-text-secondary'] = themeConfig.secondaryTextColor
    }
    if (themeConfig.mutedTextColor) {
      style['--ssw-text-muted'] = themeConfig.mutedTextColor
    }
    if (themeConfig.inputColor) {
      style['--ssw-bg-input'] = themeConfig.inputColor
    }
    if (themeConfig.hoverColor) {
      style['--ssw-bg-hover'] = themeConfig.hoverColor
    }
    return Object.keys(style).length > 0 ? (style as React.CSSProperties) : undefined
  }, [themeConfig])

  const openAddressModal = useCallback(() => setIsAddressModalOpen(true), [])

  return (
    <div
      className={`ssw-widget ${themeMode === 'light' ? 'ssw-light' : 'ssw-dark'}${
        themeConfig?.buttonVariant === 'outline' ? ' ssw-btn-outline' : ''
      }`}
      style={widgetStyle}
    >
      <div className='ssw-header'>
        <span className='ssw-header-title'>Swap</span>
        <div className='ssw-header-actions'>
          {enableWalletConnection && <ConnectWalletButton />}
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

      <div className='ssw-step-container'>
        {(state.matches('idle') || state.matches('input') || state.matches('quoting')) && (
          <InputStep
            context={state.context}
            send={actorRef.send}
            rates={rates ?? []}
            isLoadingRates={isLoadingRates}
            ratesError={ratesError}
            sellAssetBalance={sellAssetBalance}
            buyAssetBalance={buyAssetBalance}
            isSellBalanceLoading={isSellBalanceLoading}
            isBuyBalanceLoading={isBuyBalanceLoading}
            sellUsdValue={sellUsdValue}
            buyUsdValue={buyUsdValue}
            sellChainInfo={sellChainInfo}
            buyChainInfo={buyChainInfo}
            displayRate={displayRate}
            walletAddress={walletAddress}
            bitcoinAddress={bitcoin.address}
            solanaAddress={solana.address}
            defaultReceiveAddress={defaultReceiveAddress}
            buyAssetUsdPrice={buyAssetUsdPrice}
            onOpenTokenModal={setTokenModalType}
            onOpenAddressModal={openAddressModal}
            enableWalletConnection={enableWalletConnection}
            onConnectWallet={onConnectWallet}
            bitcoinState={bitcoin.state}
            solanaState={solana.state}
            isQuoting={state.matches('quoting')}
            isExecuting={false}
            effectiveReceiveAddress={effectiveReceiveAddress}
            isCustomAddress={isCustomAddress}
            sellAmount={state.context.sellAmount}
            onSellAmountChange={handleSellAmountChange}
            onSwapTokens={handleSwapTokens}
            onSelectRate={handleSelectRate}
            onButtonClick={handleButtonClick}
            sellAmountBaseUnit={state.context.sellAmountBaseUnit}
            networkFeeDisplay={networkFeeDisplay}
            sellBalanceFiatValue={sellBalanceFiatValue}
            buyBalanceFiatValue={buyBalanceFiatValue}
            isBuyAssetLocked={isBuyAssetLocked}
          />
        )}

        {(state.matches('approval_needed') || state.matches('approving')) && (
          <ApprovalStep
            context={state.context}
            send={actorRef.send}
            isApproving={state.matches('approving')}
          />
        )}

        {state.matches('executing') && (
          <ExecutionStep context={state.context} send={actorRef.send} />
        )}

        {(state.matches('polling_status') ||
          state.matches('complete') ||
          state.matches('error')) && (
          <StatusStep
            context={state.context}
            send={actorRef.send}
            isPolling={state.matches('polling_status')}
            isComplete={state.matches('complete')}
            isError={state.matches('error')}
          />
        )}
      </div>

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
        disabledAssetIds={tokenModalType === 'buy' ? buyDisabledAssetIds : sellDisabledAssetIds}
        disabledChainIds={tokenModalType === 'buy' ? buyDisabledChainIds : sellDisabledChainIds}
        allowedChainIds={tokenModalType === 'buy' ? buyAllowedChainIds : sellAllowedChainIds}
        allowedAssetIds={tokenModalType === 'buy' ? buyAllowedAssetIds : sellAllowedAssetIds}
        walletAddress={walletAddress}
        currentAssetIds={[state.context.sellAsset.assetId, state.context.buyAsset.assetId]}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        slippage={state.context.slippage}
        onSlippageChange={handleSlippageChange}
      />

      <AddressInputModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        chainId={state.context.buyAsset.chainId}
        chainName={
          buyChainInfo?.name ?? state.context.buyAsset.networkName ?? state.context.buyAsset.name
        }
        currentAddress={customReceiveAddress || effectiveReceiveAddress || ''}
        onAddressChange={setCustomReceiveAddress}
        walletAddress={
          buyChainType === 'evm'
            ? walletAddress
            : buyChainType === 'utxo'
            ? bitcoin.address
            : buyChainType === 'solana'
            ? solana.address
            : undefined
        }
      />
    </div>
  )
}

type SwapWidgetCoreProps = {
  walletClient: unknown
  defaultSellAsset: Asset
  defaultBuyAsset: Asset
  defaultSlippage: string
  defaultReceiveAddress?: string
  affiliateAddress?: string
  apiClient: ReturnType<typeof createApiClient>
  theme: SwapWidgetProps['theme']
  showPoweredBy: boolean
  enableWalletConnection: boolean
  isBuyAssetLocked: boolean
  onConnectWallet?: () => void
  onSwapSuccess?: (txHash: string) => void
  onSwapError?: (error: Error) => void
  onAssetSelect?: (type: 'sell' | 'buy', asset: Asset) => void
  sellDisabledAssetIds: string[]
  buyDisabledAssetIds: string[]
  sellDisabledChainIds: string[]
  buyDisabledChainIds: string[]
  sellAllowedChainIds?: string[]
  buyAllowedChainIds?: string[]
  sellAllowedAssetIds?: string[]
  buyAllowedAssetIds?: string[]
}

const SwapWidgetCore = ({
  walletClient,
  defaultSellAsset,
  defaultBuyAsset,
  defaultSlippage,
  defaultReceiveAddress,
  affiliateAddress,
  apiClient,
  theme,
  showPoweredBy,
  enableWalletConnection,
  isBuyAssetLocked,
  onConnectWallet,
  onSwapSuccess,
  onSwapError,
  onAssetSelect,
  sellDisabledAssetIds,
  buyDisabledAssetIds,
  sellDisabledChainIds,
  buyDisabledChainIds,
  sellAllowedChainIds,
  buyAllowedChainIds,
  sellAllowedAssetIds,
  buyAllowedAssetIds,
}: SwapWidgetCoreProps) => {
  const actorRef = SwapMachineCtx.useActorRef()

  const bitcoin = useBitcoinSigning()
  const solana = useSolanaSigning()

  const [customReceiveAddress, setCustomReceiveAddress] = useState<string>('')

  const walletAddress = useMemo(() => {
    if (!walletClient) return undefined
    return (walletClient as WalletClient).account?.address
  }, [walletClient])

  const buyChainId = SwapMachineCtx.useSelector(s => s.context.buyAsset.chainId)
  const buyChainType = getChainType(buyChainId)

  const effectiveReceiveAddress = useMemo(() => {
    if (customReceiveAddress) return customReceiveAddress
    if (defaultReceiveAddress) return defaultReceiveAddress

    if (buyChainType === 'utxo') return bitcoin.address ?? ''
    if (buyChainType === 'solana') return solana.address ?? ''
    if (buyChainType === 'evm') return walletAddress ?? ''

    return ''
  }, [
    customReceiveAddress,
    defaultReceiveAddress,
    buyChainType,
    bitcoin.address,
    solana.address,
    walletAddress,
  ])

  const isCustomAddress = useMemo(
    () => !!customReceiveAddress && customReceiveAddress !== walletAddress,
    [customReceiveAddress, walletAddress],
  )

  const initialSyncRef = useRef(false)
  useEffect(() => {
    if (initialSyncRef.current) return
    initialSyncRef.current = true
    actorRef.send({ type: 'SET_SELL_ASSET', asset: defaultSellAsset })
    actorRef.send({ type: 'SET_BUY_ASSET', asset: defaultBuyAsset })
    actorRef.send({ type: 'SET_SLIPPAGE', slippage: defaultSlippage })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaults are initial-only, ref guard ensures single execution
  }, [actorRef])

  useEffect(() => {
    actorRef.send({ type: 'SET_WALLET_ADDRESS', address: walletAddress })
  }, [walletAddress, actorRef])

  useEffect(() => {
    actorRef.send({ type: 'SET_RECEIVE_ADDRESS', address: effectiveReceiveAddress })
  }, [effectiveReceiveAddress, actorRef])

  const walletValue: SwapWalletContextValue = useMemo(
    () => ({
      walletClient,
      walletAddress,
      effectiveReceiveAddress,
      isCustomAddress,
      customReceiveAddress,
      setCustomReceiveAddress,
      bitcoin,
      solana,
    }),
    [
      walletClient,
      walletAddress,
      effectiveReceiveAddress,
      isCustomAddress,
      customReceiveAddress,
      bitcoin,
      solana,
    ],
  )

  return (
    <SwapWalletProvider value={walletValue}>
      <SwapWidgetContent
        apiClient={apiClient}
        theme={theme}
        showPoweredBy={showPoweredBy}
        defaultReceiveAddress={defaultReceiveAddress}
        affiliateAddress={affiliateAddress}
        enableWalletConnection={enableWalletConnection}
        isBuyAssetLocked={isBuyAssetLocked}
        onConnectWallet={onConnectWallet}
        onSwapSuccess={onSwapSuccess}
        onSwapError={onSwapError}
        onAssetSelect={onAssetSelect}
        sellDisabledAssetIds={sellDisabledAssetIds}
        buyDisabledAssetIds={buyDisabledAssetIds}
        sellDisabledChainIds={sellDisabledChainIds}
        buyDisabledChainIds={buyDisabledChainIds}
        sellAllowedChainIds={sellAllowedChainIds}
        buyAllowedChainIds={buyAllowedChainIds}
        sellAllowedAssetIds={sellAllowedAssetIds}
        buyAllowedAssetIds={buyAllowedAssetIds}
      />
    </SwapWalletProvider>
  )
}

const SwapWidgetWithExternalWallet = (props: SwapWidgetProps) => {
  const apiClient = useMemo(
    () =>
      createApiClient({
        baseUrl: props.apiBaseUrl,
        affiliateAddress: props.affiliateAddress,
        affiliateBps: props.affiliateBps,
      }),
    [props.apiBaseUrl, props.affiliateAddress, props.affiliateBps],
  )

  return (
    <QueryClientProvider client={queryClient}>
      <SwapMachineCtx.Provider>
        <SwapWidgetCore
          walletClient={props.walletClient}
          defaultSellAsset={props.defaultSellAsset ?? DEFAULT_SELL_ASSET}
          defaultBuyAsset={props.defaultBuyAsset ?? DEFAULT_BUY_ASSET}
          defaultSlippage={props.defaultSlippage ?? '0.5'}
          defaultReceiveAddress={props.defaultReceiveAddress}
          affiliateAddress={props.affiliateAddress}
          apiClient={apiClient}
          theme={props.theme}
          showPoweredBy={props.showPoweredBy ?? true}
          enableWalletConnection={false}
          isBuyAssetLocked={props.isBuyAssetLocked ?? false}
          onConnectWallet={props.onConnectWallet}
          onSwapSuccess={props.onSwapSuccess}
          onSwapError={props.onSwapError}
          onAssetSelect={props.onAssetSelect}
          sellDisabledAssetIds={props.sellDisabledAssetIds ?? props.disabledAssetIds ?? []}
          buyDisabledAssetIds={props.buyDisabledAssetIds ?? props.disabledAssetIds ?? []}
          sellDisabledChainIds={props.sellDisabledChainIds ?? props.disabledChainIds ?? []}
          buyDisabledChainIds={props.buyDisabledChainIds ?? props.disabledChainIds ?? []}
          sellAllowedChainIds={props.sellAllowedChainIds ?? props.allowedChainIds}
          buyAllowedChainIds={props.buyAllowedChainIds ?? props.allowedChainIds}
          sellAllowedAssetIds={props.sellAllowedAssetIds}
          buyAllowedAssetIds={props.buyAllowedAssetIds}
        />
      </SwapMachineCtx.Provider>
    </QueryClientProvider>
  )
}

const SwapWidgetWithInternalWallet = (
  props: SwapWidgetProps & { walletConnectProjectId: string },
) => {
  const apiClient = useMemo(
    () =>
      createApiClient({
        baseUrl: props.apiBaseUrl,
        affiliateAddress: props.affiliateAddress,
        affiliateBps: props.affiliateBps,
      }),
    [props.apiBaseUrl, props.affiliateAddress, props.affiliateBps],
  )

  return (
    <InternalWalletProvider projectId={props.walletConnectProjectId}>
      {walletClient => (
        <QueryClientProvider client={queryClient}>
          <SwapMachineCtx.Provider>
            <SwapWidgetCore
              walletClient={walletClient}
              defaultSellAsset={props.defaultSellAsset ?? DEFAULT_SELL_ASSET}
              defaultBuyAsset={props.defaultBuyAsset ?? DEFAULT_BUY_ASSET}
              defaultSlippage={props.defaultSlippage ?? '0.5'}
              defaultReceiveAddress={props.defaultReceiveAddress}
              affiliateAddress={props.affiliateAddress}
              apiClient={apiClient}
              theme={props.theme}
              showPoweredBy={props.showPoweredBy ?? true}
              enableWalletConnection={true}
              onConnectWallet={props.onConnectWallet}
              onSwapSuccess={props.onSwapSuccess}
              onSwapError={props.onSwapError}
              onAssetSelect={props.onAssetSelect}
              sellDisabledAssetIds={props.sellDisabledAssetIds ?? props.disabledAssetIds ?? []}
              buyDisabledAssetIds={props.buyDisabledAssetIds ?? props.disabledAssetIds ?? []}
              sellDisabledChainIds={props.sellDisabledChainIds ?? props.disabledChainIds ?? []}
              buyDisabledChainIds={props.buyDisabledChainIds ?? props.disabledChainIds ?? []}
              sellAllowedChainIds={props.sellAllowedChainIds ?? props.allowedChainIds}
              buyAllowedChainIds={props.buyAllowedChainIds ?? props.allowedChainIds}
              sellAllowedAssetIds={props.sellAllowedAssetIds}
              buyAllowedAssetIds={props.buyAllowedAssetIds}
              isBuyAssetLocked={props.isBuyAssetLocked ?? false}
            />
          </SwapMachineCtx.Provider>
        </QueryClientProvider>
      )}
    </InternalWalletProvider>
  )
}

export const SwapWidget = (props: SwapWidgetProps) => {
  if (props.enableWalletConnection && props.walletConnectProjectId) {
    return (
      <SwapWidgetWithInternalWallet
        {...props}
        walletConnectProjectId={props.walletConnectProjectId}
      />
    )
  }

  return <SwapWidgetWithExternalWallet {...props} />
}
