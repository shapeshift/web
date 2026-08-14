import './SwapWidget.css'

import { useAppKitAccount } from '@reown/appkit/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { createApiClient } from '../api/client'
import { DEFAULT_BUY_ASSET, DEFAULT_SELL_ASSET } from '../constants/defaults'
import type { SwapWalletContextValue } from '../contexts/SwapWalletContext'
import { SwapWalletProvider } from '../contexts/SwapWalletContext'
import { useBitcoinSigning } from '../hooks/useBitcoinSigning'
import { useDepositPolling } from '../hooks/useDepositPolling'
import { useEvmSigning } from '../hooks/useEvmSigning'
import { useSellFiatSync } from '../hooks/useSellFiatSync'
import { useSolanaSigning } from '../hooks/useSolanaSigning'
import { useStatusPolling } from '../hooks/useStatusPolling'
import { useSwapApproval } from '../hooks/useSwapApproval'
import { useSwapCallbacks } from '../hooks/useSwapCallbacks'
import { useSwapDisplayValues } from '../hooks/useSwapDisplayValues'
import { useSwapExecution } from '../hooks/useSwapExecution'
import { useSwapHandlers } from '../hooks/useSwapHandlers'
import { useSwapQuoting } from '../hooks/useSwapQuoting'
import { SwapMachineCtx } from '../machines/SwapMachineContext'
import type { Asset, SwapWidgetFilters, SwapWidgetProps, ThemeMode } from '../types'
import { formatAmountForInput, getChainType } from '../types'
import { validateAddress } from '../utils/addressValidation'
import {
  clearPendingDeposit,
  loadPendingDeposit,
  savePendingDeposit,
} from '../utils/pendingDeposit'
import { resolveReceiveAddress } from '../utils/receiveAddress'
import { resolveSendAddress } from '../utils/sendAddress'
import { ApprovalStep } from './ApprovalStep'
import { DepositStep } from './DepositStep'
import { ExecutionStep } from './ExecutionStep'
import { InputStep } from './InputStep'
import { SettingsModal } from './SettingsModal'
import { StatusStep } from './StatusStep'
import { TokenSelectModal } from './TokenSelectModal'
import { AppKitWalletProvider, ConnectWalletButton } from './WalletProvider'

type SwapWidgetContentProps = {
  apiClient: ReturnType<typeof createApiClient>
  theme: SwapWidgetProps['theme']
  showPoweredBy: boolean
  showConnectButton: boolean
  isBuyAssetLocked: boolean
  isBuyAmountLocked: boolean
  isReceiveAddressLocked: boolean
  isPayment: boolean
  partnerCode?: string
  canRedirectToShapeshift: boolean
  onSwapSuccess?: (txHash: string) => void
  onSwapError?: (error: Error) => void
  sellFilters: SwapWidgetFilters
  buyFilters: SwapWidgetFilters
  allowedSwapperNames?: SwapWidgetProps['allowedSwapperNames']
  ratesRefetchInterval?: SwapWidgetProps['ratesRefetchInterval']
}

const SwapWidgetContent = ({
  apiClient,
  theme = 'dark',
  showPoweredBy,
  showConnectButton,
  isBuyAssetLocked,
  isBuyAmountLocked,
  isReceiveAddressLocked,
  isPayment,
  partnerCode,
  canRedirectToShapeshift,
  onSwapSuccess,
  onSwapError,
  sellFilters,
  buyFilters,
  allowedSwapperNames,
  ratesRefetchInterval,
}: SwapWidgetContentProps) => {
  const state = SwapMachineCtx.useSelector(s => s)
  const actorRef = SwapMachineCtx.useActorRef()

  const isRequotingDeposit =
    state.matches('quoting') && state.context.isDepositFlow && !!state.context.quote

  const [tokenModalType, setTokenModalType] = useState<'sell' | 'buy' | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const themeMode: ThemeMode = typeof theme === 'string' ? theme : theme.mode
  const themeConfig = typeof theme === 'object' ? theme : undefined

  const displayValues = useSwapDisplayValues({
    apiClient,
    allowedSwapperNames,
    ratesRefetchInterval,
  })
  const { rates, sellAssetBalance, refetchSellBalance, refetchBuyBalance } = displayValues

  const {
    handleSwapTokens,
    handleSellAssetSelect,
    handleBuyAssetSelect,
    handleSellAmountChange,
    handleBuyAmountChange,
    handleToggleSellFiat,
    handleSelectRate,
    handleSlippageChange,
    handleButtonClick,
  } = useSwapHandlers({ partnerCode, allowShapeshiftRedirect: canRedirectToShapeshift })

  useSwapQuoting({ apiClient, rates, sellAssetBalance })
  useSwapApproval()
  useSwapExecution()
  useStatusPolling({ apiClient })
  useDepositPolling({ apiClient })
  useSwapCallbacks({ onSwapSuccess, onSwapError, refetchSellBalance, refetchBuyBalance })
  useSellFiatSync(displayValues.sellAssetUsdPrice)

  const hasSavedDepositRef = useRef(false)
  useEffect(() => {
    const snap = actorRef.getSnapshot()
    const { quote, sendAddress, receiveAddress, isDepositFlow } = snap.context

    if (
      snap.matches('awaiting_deposit') &&
      isDepositFlow &&
      quote?.depositAddress &&
      sendAddress &&
      receiveAddress
    ) {
      savePendingDeposit({
        quote,
        refundAddress: sendAddress,
        receiveAddress,
        sellAmountBaseUnit: snap.context.sellAmountBaseUnit,
        buyAmountBaseUnit: snap.context.buyAmountBaseUnit,
      })
      hasSavedDepositRef.current = true
      return
    }

    // Never clear one we didn't save - it may be a deposit the restore is about to read
    if (hasSavedDepositRef.current) clearPendingDeposit()

    // eslint-disable-next-line react-hooks/exhaustive-deps -- state.value is the sole trigger; context is read from the snapshot
  }, [state.value])

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
          {showConnectButton && <ConnectWalletButton />}
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
        {(state.matches('idle') ||
          state.matches('input') ||
          (state.matches('quoting') && !isRequotingDeposit)) && (
          <InputStep
            displayValues={displayValues}
            onOpenTokenModal={setTokenModalType}
            onSellAmountChange={handleSellAmountChange}
            onBuyAmountChange={handleBuyAmountChange}
            onToggleSellFiat={handleToggleSellFiat}
            onSwapTokens={handleSwapTokens}
            onSelectRate={handleSelectRate}
            onButtonClick={handleButtonClick}
            isBuyAssetLocked={isBuyAssetLocked}
            isBuyAmountLocked={isBuyAmountLocked}
            isReceiveAddressLocked={isReceiveAddressLocked}
            allowShapeshiftRedirect={canRedirectToShapeshift}
          />
        )}

        {(state.matches('approval_needed') || state.matches('approving')) && <ApprovalStep />}

        {state.matches('executing') && <ExecutionStep />}

        {(state.matches('awaiting_deposit') ||
          state.matches('deposit_expired') ||
          isRequotingDeposit) && <DepositStep />}

        {(state.matches('polling_status') ||
          state.matches('complete') ||
          state.matches('error')) && <StatusStep isPayment={isPayment} />}
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
        disabledAssetIds={
          (tokenModalType === 'buy' ? buyFilters : sellFilters).disabledAssetIds ?? []
        }
        disabledChainIds={
          (tokenModalType === 'buy' ? buyFilters : sellFilters).disabledChainIds ?? []
        }
        allowedChainIds={(tokenModalType === 'buy' ? buyFilters : sellFilters).allowedChainIds}
        allowedAssetIds={(tokenModalType === 'buy' ? buyFilters : sellFilters).allowedAssetIds}
        allowShapeshiftRedirect={canRedirectToShapeshift}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSlippageChange={handleSlippageChange}
      />
    </div>
  )
}

type SwapWidgetCoreProps = {
  defaultSellAsset: Asset
  defaultBuyAsset: Asset
  defaultSlippage: string
  apiClient: ReturnType<typeof createApiClient>
  theme: SwapWidgetProps['theme']
  showPoweredBy: boolean
  showConnectButton: boolean
  isBuyAssetLocked: boolean
  defaultReceiveAddress?: string
  isReceiveAddressLocked: boolean
  defaultBuyAmountCryptoBaseUnit?: string
  isBuyAmountLocked: boolean
  partnerCode?: string
  allowShapeshiftRedirect: boolean
  onSwapSuccess?: (txHash: string) => void
  onSwapError?: (error: Error) => void
  sellFilters: SwapWidgetFilters
  buyFilters: SwapWidgetFilters
  allowedSwapperNames?: SwapWidgetProps['allowedSwapperNames']
  ratesRefetchInterval?: SwapWidgetProps['ratesRefetchInterval']
}

const SwapWidgetCore = ({
  defaultSellAsset,
  defaultBuyAsset,
  defaultSlippage,
  apiClient,
  theme,
  showPoweredBy,
  showConnectButton,
  isBuyAssetLocked,
  defaultReceiveAddress,
  isReceiveAddressLocked,
  defaultBuyAmountCryptoBaseUnit,
  isBuyAmountLocked,
  partnerCode,
  allowShapeshiftRedirect,
  onSwapSuccess,
  onSwapError,
  sellFilters,
  buyFilters,
  allowedSwapperNames,
  ratesRefetchInterval,
}: SwapWidgetCoreProps) => {
  const actorRef = SwapMachineCtx.useActorRef()

  const evm = useEvmSigning()
  const bitcoin = useBitcoinSigning()
  const solana = useSolanaSigning()

  const [customReceiveAddress, setCustomReceiveAddress] = useState<string>(
    defaultReceiveAddress ?? '',
  )

  const [customRefundAddress, setCustomRefundAddress] = useState<string>('')

  const sellChainId = SwapMachineCtx.useSelector(s => s.context.sellAsset.chainId)
  const buyChainId = SwapMachineCtx.useSelector(s => s.context.buyAsset.chainId)

  const sellChainType = getChainType(sellChainId)
  const buyChainType = getChainType(buyChainId)

  const { status: evmStatus } = useAppKitAccount({ namespace: 'eip155' })
  const { status: utxoStatus } = useAppKitAccount({ namespace: 'bip122' })
  const { status: solanaStatus } = useAppKitAccount({ namespace: 'solana' })

  const isReceiveAddressResolving = useMemo(() => {
    const status = (() => {
      if (buyChainType === 'evm') return evmStatus
      if (buyChainType === 'utxo') return utxoStatus
      if (buyChainType === 'solana') return solanaStatus
    })()
    return status === 'connecting' || status === 'reconnecting'
  }, [buyChainType, evmStatus, utxoStatus, solanaStatus])

  const addressForChain = useCallback(
    (chainType: ReturnType<typeof getChainType>, chainId: string): string | undefined => {
      const address = (() => {
        if (chainType === 'evm') return evm.address
        if (chainType === 'utxo') return bitcoin.address
        if (chainType === 'solana') return solana.address
        return undefined
      })()

      // The utxo adapter holds a bitcoin address only, so it can't serve a doge, ltc or bch swap
      return address && validateAddress(address, chainId).valid ? address : undefined
    },
    [evm.address, bitcoin.address, solana.address],
  )

  const walletSendAddress = useMemo(
    () => addressForChain(sellChainType, sellChainId),
    [addressForChain, sellChainType, sellChainId],
  )

  const sendAddress = useMemo(
    () =>
      resolveSendAddress({
        customAddress: customRefundAddress,
        walletAddress: walletSendAddress,
        sellChainId,
      }),
    [customRefundAddress, walletSendAddress, sellChainId],
  )

  const walletReceiveAddress = useMemo(
    () => addressForChain(buyChainType, buyChainId),
    [addressForChain, buyChainType, buyChainId],
  )

  const receiveAddress = useMemo(
    () =>
      resolveReceiveAddress({
        isLocked: isReceiveAddressLocked,
        defaultAddress: defaultReceiveAddress,
        customAddress: customReceiveAddress,
        walletAddress: walletReceiveAddress,
        buyChainId,
      }),
    [
      isReceiveAddressLocked,
      defaultReceiveAddress,
      customReceiveAddress,
      walletReceiveAddress,
      buyChainId,
    ],
  )

  // Unlike the initial sync below, a locked amount keeps tracking its prop
  useEffect(() => {
    if (!isBuyAmountLocked) return

    actorRef.send({
      type: 'SET_BUY_AMOUNT',
      amount: defaultBuyAmountCryptoBaseUnit
        ? formatAmountForInput(defaultBuyAmountCryptoBaseUnit, defaultBuyAsset.precision)
        : '',
      amountBaseUnit: defaultBuyAmountCryptoBaseUnit,
    })
  }, [isBuyAmountLocked, defaultBuyAmountCryptoBaseUnit, defaultBuyAsset.precision, actorRef])

  const initialSyncRef = useRef(false)
  useLayoutEffect(() => {
    if (initialSyncRef.current) return
    initialSyncRef.current = true
    actorRef.send({ type: 'SET_SELL_ASSET', asset: defaultSellAsset })
    actorRef.send({ type: 'SET_BUY_ASSET', asset: defaultBuyAsset })
    actorRef.send({ type: 'SET_SLIPPAGE', slippage: defaultSlippage })
    actorRef.send({
      type: 'SET_BUY_AMOUNT',
      amount: defaultBuyAmountCryptoBaseUnit
        ? formatAmountForInput(defaultBuyAmountCryptoBaseUnit, defaultBuyAsset.precision)
        : '',
      amountBaseUnit: defaultBuyAmountCryptoBaseUnit,
    })

    // Restored last so the default assets above can't clobber the quoted ones
    const pending = loadPendingDeposit(Date.now())
    if (pending) {
      actorRef.send({
        type: 'RESTORE_DEPOSIT',
        quote: pending.quote,
        sendAddress: pending.refundAddress,
        receiveAddress: pending.receiveAddress,
        sellAmountBaseUnit: pending.sellAmountBaseUnit,
        buyAmountBaseUnit: pending.buyAmountBaseUnit,
      })
      setCustomRefundAddress(pending.refundAddress)
      setCustomReceiveAddress(pending.receiveAddress)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaults are initial-only, ref guard ensures single execution
  }, [actorRef])

  useEffect(() => {
    actorRef.send({ type: 'SET_SEND_ADDRESS', address: sendAddress })
  }, [sendAddress, actorRef])

  useEffect(() => {
    actorRef.send({ type: 'SET_RECEIVE_ADDRESS', address: receiveAddress })
  }, [receiveAddress, actorRef])

  useEffect(() => {
    if (!customReceiveAddress) return
    if (!validateAddress(customReceiveAddress, buyChainId).valid) setCustomReceiveAddress('')
  }, [buyChainId, customReceiveAddress])

  useEffect(() => {
    if (!customRefundAddress) return
    if (!validateAddress(customRefundAddress, sellChainId).valid) setCustomRefundAddress('')
  }, [sellChainId, customRefundAddress])

  const walletValue: SwapWalletContextValue = useMemo(
    () => ({
      sendAddress,
      walletSendAddress,
      setCustomRefundAddress,
      receiveAddress,
      isReceiveAddressResolving,
      isReceiveAddressBlocked: isReceiveAddressLocked && !receiveAddress,
      customReceiveAddress,
      setCustomReceiveAddress,
      evm,
      bitcoin,
      solana,
    }),
    [
      sendAddress,
      walletSendAddress,
      receiveAddress,
      isReceiveAddressResolving,
      isReceiveAddressLocked,
      customReceiveAddress,
      evm,
      bitcoin,
      solana,
    ],
  )

  const hasLockedBuyAmount = isBuyAmountLocked && !!defaultBuyAmountCryptoBaseUnit
  const isPayment = hasLockedBuyAmount && isReceiveAddressLocked && !!defaultReceiveAddress

  // The redirect carries neither the address nor the buy amount, so locking either rules it out
  const canRedirectToShapeshift =
    allowShapeshiftRedirect && !hasLockedBuyAmount && !isReceiveAddressLocked

  return (
    <SwapWalletProvider value={walletValue}>
      <SwapWidgetContent
        apiClient={apiClient}
        theme={theme}
        showPoweredBy={showPoweredBy}
        showConnectButton={showConnectButton}
        isBuyAssetLocked={isBuyAssetLocked || hasLockedBuyAmount}
        isBuyAmountLocked={isBuyAmountLocked}
        isReceiveAddressLocked={isReceiveAddressLocked}
        isPayment={isPayment}
        partnerCode={partnerCode}
        canRedirectToShapeshift={canRedirectToShapeshift}
        onSwapSuccess={onSwapSuccess}
        onSwapError={onSwapError}
        sellFilters={sellFilters}
        buyFilters={buyFilters}
        allowedSwapperNames={allowedSwapperNames}
        ratesRefetchInterval={ratesRefetchInterval}
      />
    </SwapWalletProvider>
  )
}

export const SwapWidget = (props: SwapWidgetProps) => {
  const apiClient = useMemo(
    () =>
      createApiClient({
        baseUrl: props.apiBaseUrl,
        partnerCode: props.partnerCode,
      }),
    [props.apiBaseUrl, props.partnerCode],
  )

  return (
    <AppKitWalletProvider projectId={props.walletConnectProjectId}>
      <SwapMachineCtx.Provider>
        <SwapWidgetCore
          defaultSellAsset={props.defaultSellAsset ?? DEFAULT_SELL_ASSET}
          defaultBuyAsset={props.defaultBuyAsset ?? DEFAULT_BUY_ASSET}
          defaultSlippage={props.defaultSlippage ?? '0.5'}
          apiClient={apiClient}
          theme={props.theme}
          showPoweredBy={props.showPoweredBy ?? true}
          showConnectButton={props.showConnectButton ?? true}
          isBuyAssetLocked={props.isBuyAssetLocked ?? false}
          defaultReceiveAddress={props.defaultReceiveAddress}
          isReceiveAddressLocked={props.isReceiveAddressLocked ?? false}
          defaultBuyAmountCryptoBaseUnit={props.defaultBuyAmountCryptoBaseUnit}
          isBuyAmountLocked={props.isBuyAmountLocked ?? false}
          partnerCode={props.partnerCode}
          allowShapeshiftRedirect={props.allowShapeshiftRedirect ?? true}
          onSwapSuccess={props.onSwapSuccess}
          onSwapError={props.onSwapError}
          sellFilters={props.sellFilters ?? {}}
          buyFilters={props.buyFilters ?? {}}
          allowedSwapperNames={props.allowedSwapperNames}
          ratesRefetchInterval={props.ratesRefetchInterval}
        />
      </SwapMachineCtx.Provider>
    </AppKitWalletProvider>
  )
}
