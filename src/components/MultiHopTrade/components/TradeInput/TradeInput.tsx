import { ArrowDownIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Button,
  CardFooter,
  CardHeader,
  Divider,
  Flex,
  Heading,
  IconButton,
  Stack,
  Tooltip,
} from '@chakra-ui/react'
import { KeplrHDWallet } from '@shapeshiftoss/hdwallet-keplr/dist/keplr'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { MessageOverlay } from 'components/MessageOverlay/MessageOverlay'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { RateGasRow } from 'components/MultiHopTrade/components/RateGasRow'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { ReceiveSummary } from 'components/MultiHopTrade/components/TradeConfirm/ReceiveSummary'
import { DonationCheckbox } from 'components/MultiHopTrade/components/TradeInput/components/DonationCheckbox'
import { ManualAddressEntry } from 'components/MultiHopTrade/components/TradeInput/components/ManualAddressEntry'
import { getSwapperSupportsSlippage } from 'components/MultiHopTrade/components/TradeInput/getSwapperSupportsSlippage'
import { getMixpanelEventData } from 'components/MultiHopTrade/helpers'
import { useActiveQuoteStatus } from 'components/MultiHopTrade/hooks/quoteValidation/useActiveQuoteStatus'
import { usePriceImpact } from 'components/MultiHopTrade/hooks/quoteValidation/usePriceImpact'
import { checkApprovalNeeded } from 'components/MultiHopTrade/hooks/useAllowanceApproval/helpers'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes/useGetTradeQuotes'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useModal } from 'hooks/useModal/useModal'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { bnOrZero, positiveOrZero } from 'lib/bignumber/bignumber'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import {
  selectSwappersApiTradeQuotePending,
  selectSwappersApiTradeQuotes,
} from 'state/apis/swappers/selectors'
import {
  selectBuyAsset,
  selectManualReceiveAddressIsValidating,
  selectSellAmountCryptoPrecision,
  selectSellAsset,
} from 'state/slices/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import {
  selectActiveQuote,
  selectActiveQuoteError,
  selectActiveSwapperName,
  selectBuyAmountBeforeFeesCryptoPrecision,
  selectFirstHop,
  selectNetReceiveAmountCryptoPrecision,
  selectReceiveBuyAmountUserCurrency,
  selectSwapperSupportsCrossAccountTrade,
  selectTotalNetworkFeeUserCurrencyPrecision,
  selectTotalProtocolFeeByAsset,
  selectTradeSlippagePercentageDecimal,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'

import { useAccountIds } from '../../hooks/useAccountIds'
import { useSupportedAssets } from '../../hooks/useSupportedAssets'
import { PriceImpact } from '../PriceImpact'
import { SellAssetInput } from './components/SellAssetInput'
import { TradeQuotes } from './components/TradeQuotes/TradeQuotes'

const formControlProps = { borderRadius: 0, background: 'transparent', borderWidth: 0 }

const percentOptions = [1]

export const TradeInput = memo(() => {
  useGetTradeQuotes()
  const {
    state: { wallet },
  } = useWallet()
  const { handleSubmit } = useFormContext()
  const dispatch = useAppDispatch()
  const mixpanel = getMixPanel()
  const history = useHistory()
  const { showErrorToast } = useErrorHandler()
  const [isConfirmationLoading, setIsConfirmationLoading] = useState(false)
  const [showTradeQuotes, toggleShowTradeQuotes] = useToggle(false)
  const isKeplr = useMemo(() => wallet instanceof KeplrHDWallet, [wallet])
  const buyAssetSearch = useModal('buyAssetSearch')
  const sellAssetSearch = useModal('sellAssetSearch')
  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAsset = useAppSelector(selectSellAsset)
  const { isModeratePriceImpact, priceImpactPercentage } = usePriceImpact()

  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const swapperSupportsCrossAccountTrade = useAppSelector(selectSwapperSupportsCrossAccountTrade)
  const totalProtocolFees = useAppSelector(selectTotalProtocolFeeByAsset)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectNetReceiveAmountCryptoPrecision)
  const buyAmountAfterFeesUserCurrency = useAppSelector(selectReceiveBuyAmountUserCurrency)
  const totalNetworkFeeFiatPrecision = useAppSelector(selectTotalNetworkFeeUserCurrencyPrecision)
  const manualReceiveAddressIsValidating = useAppSelector(selectManualReceiveAddressIsValidating)
  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)
  const slippageDecimal = useAppSelector(selectTradeSlippagePercentageDecimal)

  const hasUserEnteredAmount = useMemo(
    () => bnOrZero(sellAmountCryptoPrecision).gt(0),
    [sellAmountCryptoPrecision],
  )
  const activeQuoteStatus = useActiveQuoteStatus()
  const setBuyAsset = useCallback(
    (asset: Asset) => dispatch(swappers.actions.setBuyAsset(asset)),
    [dispatch],
  )
  const setSellAsset = useCallback(
    (asset: Asset) => dispatch(swappers.actions.setSellAsset(asset)),
    [dispatch],
  )
  const handleSwitchAssets = useCallback(
    () => dispatch(swappers.actions.switchAssets()),
    [dispatch],
  )

  useEffect(() => {
    // WARNING: do not remove.
    // clear the confirmed quote on mount to prevent stale data affecting the selectors
    dispatch(tradeQuoteSlice.actions.resetConfirmedQuote())
  }, [dispatch])

  const { supportedSellAssets, supportedBuyAssets } = useSupportedAssets()
  const activeQuote = useAppSelector(selectActiveQuote)
  const activeQuoteError = useAppSelector(selectActiveQuoteError)
  const activeSwapperName = useAppSelector(selectActiveSwapperName)
  const activeSwapperSupportsSlippage = getSwapperSupportsSlippage(activeSwapperName)
  const sortedQuotes = useAppSelector(selectSwappersApiTradeQuotes)
  const rate = activeQuote?.steps[0].rate

  const isQuoteLoading = useAppSelector(selectSwappersApiTradeQuotePending)
  const isLoading = useMemo(
    () => isQuoteLoading || isConfirmationLoading,
    [isConfirmationLoading, isQuoteLoading],
  )

  const { sellAssetAccountId, buyAssetAccountId, setSellAssetAccountId, setBuyAssetAccountId } =
    useAccountIds()
  const translate = useTranslate()
  const overlayTitle = useMemo(
    () => translate('trade.swappingComingSoonForWallet', { walletName: 'Keplr' }),
    [translate],
  )

  const handleSellAssetClick = useCallback(() => {
    sellAssetSearch.open({
      onClick: setSellAsset,
      title: 'trade.tradeFrom',
      assets: supportedSellAssets,
    })
  }, [sellAssetSearch, setSellAsset, supportedSellAssets])

  const handleBuyAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onClick: setBuyAsset,
      title: 'trade.tradeTo',
      assets: supportedBuyAssets,
    })
  }, [buyAssetSearch, setBuyAsset, supportedBuyAssets])

  const buyAmountBeforeFeesCryptoPrecision = useAppSelector(
    selectBuyAmountBeforeFeesCryptoPrecision,
  )

  const quoteHasError = useMemo(() => {
    return activeQuoteStatus.quoteErrors.length > 0
  }, [activeQuoteStatus.quoteErrors])

  const onSubmit = useCallback(async () => {
    setIsConfirmationLoading(true)
    try {
      const eventData = getMixpanelEventData()
      if (mixpanel && eventData) {
        mixpanel.track(MixPanelEvents.TradePreview, eventData)
      }

      if (!wallet) throw Error('missing wallet')
      if (!tradeQuoteStep) throw Error('missing tradeQuoteStep')
      if (!activeQuote) throw Error('missing activeQuote')

      dispatch(tradeQuoteSlice.actions.setConfirmedQuote(activeQuote))

      const isApprovalNeeded = await checkApprovalNeeded(tradeQuoteStep, wallet)

      if (isApprovalNeeded) {
        history.push({ pathname: TradeRoutePaths.Approval })
        return
      }

      history.push({ pathname: TradeRoutePaths.Confirm })
    } catch (e) {
      showErrorToast(e)
    }

    setIsConfirmationLoading(false)
  }, [activeQuote, dispatch, history, mixpanel, showErrorToast, tradeQuoteStep, wallet])

  const isSellAmountEntered = bnOrZero(sellAmountCryptoPrecision).gt(0)

  const shouldDisablePreviewButton = useMemo(() => {
    return (
      quoteHasError ||
      manualReceiveAddressIsValidating ||
      isLoading ||
      !isSellAmountEntered ||
      !activeQuote
    )
  }, [activeQuote, isLoading, isSellAmountEntered, manualReceiveAddressIsValidating, quoteHasError])

  const rightRegion = useMemo(
    () =>
      activeQuote && hasUserEnteredAmount ? (
        <IconButton
          size='sm'
          icon={showTradeQuotes ? <ArrowUpIcon /> : <ArrowDownIcon />}
          aria-label='Expand Quotes'
          onClick={toggleShowTradeQuotes}
        />
      ) : (
        <></>
      ),
    [activeQuote, hasUserEnteredAmount, showTradeQuotes, toggleShowTradeQuotes],
  )

  const tradeQuotes = useMemo(
    () =>
      hasUserEnteredAmount ? (
        <TradeQuotes isOpen={showTradeQuotes} sortedQuotes={sortedQuotes} />
      ) : null,
    [hasUserEnteredAmount, showTradeQuotes, sortedQuotes],
  )

  return (
    <MessageOverlay show={isKeplr} title={overlayTitle}>
      <SlideTransition>
        <Stack spacing={0} as='form' onSubmit={handleSubmit(onSubmit)}>
          <CardHeader px={6}>
            <Flex alignItems='center' justifyContent='space-between'>
              <Heading as='h5' fontSize='md'>
                {translate('navBar.trade')}
              </Heading>
              {(activeSwapperSupportsSlippage || sortedQuotes.length === 0) && <SlippagePopover />}
            </Flex>
          </CardHeader>
          <Stack spacing={0}>
            <SellAssetInput
              accountId={sellAssetAccountId}
              asset={sellAsset}
              label={translate('trade.payWith')}
              onAccountIdChange={setSellAssetAccountId}
              labelPostFix={
                <TradeAssetSelect
                  accountId={sellAssetAccountId}
                  onAccountIdChange={setSellAssetAccountId}
                  assetId={sellAsset.assetId}
                  onAssetClick={handleSellAssetClick}
                  label={translate('trade.from')}
                  onAssetChange={setSellAsset}
                />
              }
            />
            <Flex alignItems='center' justifyContent='center' my={-2}>
              <Divider />
              <IconButton
                onClick={handleSwitchAssets}
                isRound
                size='sm'
                position='relative'
                variant='outline'
                borderColor='border.base'
                zIndex={1}
                aria-label='Switch Assets'
                icon={<ArrowDownIcon />}
              />
              <Divider />
            </Flex>
            <TradeAssetInput
              isReadOnly={true}
              accountId={buyAssetAccountId}
              assetId={buyAsset.assetId}
              assetSymbol={buyAsset.symbol}
              assetIcon={buyAsset.icon}
              cryptoAmount={
                isSellAmountEntered
                  ? positiveOrZero(buyAmountAfterFeesCryptoPrecision).toFixed()
                  : '0'
              }
              fiatAmount={
                isSellAmountEntered ? positiveOrZero(buyAmountAfterFeesUserCurrency).toFixed() : '0'
              }
              percentOptions={percentOptions}
              showInputSkeleton={isLoading}
              showFiatSkeleton={isLoading}
              label={translate('trade.youGet')}
              rightRegion={rightRegion}
              onAccountIdChange={setBuyAssetAccountId}
              formControlProps={formControlProps}
              labelPostFix={
                <TradeAssetSelect
                  accountId={buyAssetAccountId}
                  assetId={buyAsset.assetId}
                  onAssetClick={handleBuyAssetClick}
                  onAccountIdChange={setBuyAssetAccountId}
                  accountSelectionDisabled={!swapperSupportsCrossAccountTrade}
                  label={translate('trade.to')}
                  onAssetChange={setBuyAsset}
                />
              }
            >
              {tradeQuotes}
            </TradeAssetInput>
          </Stack>
          <CardFooter
            borderTopWidth={1}
            borderColor='border.subtle'
            flexDir='column'
            gap={4}
            px={6}
            bg='background.surface.raised.accent'
            borderBottomRadius='xl'
          >
            {hasUserEnteredAmount && (
              <>
                <RateGasRow
                  sellSymbol={sellAsset.symbol}
                  buySymbol={buyAsset.symbol}
                  gasFee={totalNetworkFeeFiatPrecision ?? 'unknown'}
                  rate={rate}
                  isLoading={isLoading}
                  isError={activeQuoteError !== undefined}
                />

                {activeQuote ? (
                  <ReceiveSummary
                    isLoading={isLoading}
                    symbol={buyAsset.symbol}
                    amountCryptoPrecision={buyAmountAfterFeesCryptoPrecision ?? '0'}
                    amountBeforeFeesCryptoPrecision={buyAmountBeforeFeesCryptoPrecision}
                    protocolFees={totalProtocolFees}
                    shapeShiftFee='0'
                    slippage={slippageDecimal}
                    swapperName={activeSwapperName ?? ''}
                  />
                ) : null}
                {isModeratePriceImpact && (
                  <PriceImpact impactPercentage={priceImpactPercentage.toFixed(2)} />
                )}
              </>
            )}

            <ManualAddressEntry />
            <Tooltip label={activeQuoteStatus.error?.message ?? activeQuoteStatus.quoteErrors[0]}>
              <Button
                type='submit'
                colorScheme={quoteHasError ? 'red' : 'blue'}
                size='lg-multiline'
                data-test='trade-form-preview-button'
                isDisabled={shouldDisablePreviewButton}
                isLoading={isLoading}
                mx={-2}
              >
                <Text translation={activeQuoteStatus.quoteStatusTranslation} />
              </Button>
            </Tooltip>
            {hasUserEnteredAmount && <DonationCheckbox isLoading={isLoading} />}
          </CardFooter>
        </Stack>
      </SlideTransition>
    </MessageOverlay>
  )
})
