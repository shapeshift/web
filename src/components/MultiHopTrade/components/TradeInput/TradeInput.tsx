import { ArrowDownIcon, ArrowForwardIcon, ArrowUpIcon } from '@chakra-ui/icons'
import {
  Button,
  Flex,
  IconButton,
  Stack,
  Tooltip,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import { KeplrHDWallet } from '@shapeshiftoss/hdwallet-keplr/dist/keplr'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { MessageOverlay } from 'components/MessageOverlay/MessageOverlay'
import { DonationCheckbox } from 'components/MultiHopTrade/components/TradeInput/components/DonationCheckbox'
import { ManualAddressEntry } from 'components/MultiHopTrade/components/TradeInput/components/ManualAddressEntry'
import { getMixpanelEventData } from 'components/MultiHopTrade/helpers'
import { useActiveQuoteStatus } from 'components/MultiHopTrade/hooks/quoteValidation/useActiveQuoteStatus'
import { checkApprovalNeeded } from 'components/MultiHopTrade/hooks/useAllowanceApproval/helpers'
import { TradeRoutePaths } from 'components/MultiHopTrade/types'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { TradeAssetSelect } from 'components/Trade/Components/AssetSelection'
import { RateGasRow } from 'components/Trade/Components/RateGasRow'
import { TradeAssetInput } from 'components/Trade/Components/TradeAssetInput'
import { ReceiveSummary } from 'components/Trade/TradeConfirm/ReceiveSummary'
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
  selectNetBuyAmountUserCurrency,
  selectNetReceiveAmountCryptoPrecision,
  selectSwapperSupportsCrossAccountTrade,
  selectTotalNetworkFeeUserCurrencyPrecision,
  selectTotalProtocolFeeByAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { tradeQuoteSlice } from 'state/slices/tradeQuoteSlice/tradeQuoteSlice'
import { useAppDispatch, useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { useAccountIds } from '../../hooks/useAccountIds'
import { useGetTradeQuotes } from '../../hooks/useGetTradeQuotes'
import { useSupportedAssets } from '../../hooks/useSupportedAssets'
import { SellAssetInput } from './components/SellAssetInput'
import { TradeQuotes } from './components/TradeQuotes/TradeQuotes'

export const TradeInput = () => {
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
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const buyAssetSearch = useModal('buyAssetSearch')
  const sellAssetSearch = useModal('sellAssetSearch')
  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAsset = useAppSelector(selectSellAsset)
  const tradeQuoteStep = useAppSelector(selectFirstHop)
  const swapperSupportsCrossAccountTrade = useAppSelector(selectSwapperSupportsCrossAccountTrade)
  const totalProtocolFees = useAppSelector(selectTotalProtocolFeeByAsset)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectNetReceiveAmountCryptoPrecision)
  const buyAmountAfterFeesUserCurrency = useAppSelector(selectNetBuyAmountUserCurrency)
  const totalNetworkFeeFiatPrecision = useAppSelector(selectTotalNetworkFeeUserCurrencyPrecision)
  const manualReceiveAddressIsValidating = useAppSelector(selectManualReceiveAddressIsValidating)
  const sellAmountCryptoPrecision = useAppSelector(selectSellAmountCryptoPrecision)

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
    return quoteHasError || manualReceiveAddressIsValidating || isLoading || !isSellAmountEntered
  }, [isLoading, isSellAmountEntered, manualReceiveAddressIsValidating, quoteHasError])

  return (
    <MessageOverlay show={isKeplr} title={overlayTitle}>
      <SlideTransition>
        <Stack spacing={6} as='form' onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={2}>
            <Flex alignItems='center' flexDir={{ base: 'column', md: 'row' }} width='full'>
              <TradeAssetSelect
                accountId={sellAssetAccountId}
                onAccountIdChange={setSellAssetAccountId}
                assetId={sellAsset.assetId}
                onAssetClick={handleSellAssetClick}
                label={translate('trade.from')}
              />
              <IconButton
                onClick={handleSwitchAssets}
                isRound
                mx={{ base: 0, md: -3 }}
                my={{ base: -3, md: 0 }}
                size='sm'
                position='relative'
                borderColor={useColorModeValue('gray.100', 'gray.750')}
                borderWidth={1}
                boxShadow={`0 0 0 3px var(${useColorModeValue(
                  '--chakra-colors-white',
                  '--chakra-colors-gray-785',
                )})`}
                bg={useColorModeValue('white', 'gray.850')}
                zIndex={1}
                aria-label='Switch Assets'
                icon={isLargerThanMd ? <ArrowForwardIcon /> : <ArrowDownIcon />}
              />
              <TradeAssetSelect
                accountId={buyAssetAccountId}
                assetId={buyAsset.assetId}
                onAssetClick={handleBuyAssetClick}
                onAccountIdChange={setBuyAssetAccountId}
                accountSelectionDisabled={!swapperSupportsCrossAccountTrade}
                label={translate('trade.to')}
              />
            </Flex>
            <SellAssetInput
              accountId={sellAssetAccountId}
              asset={sellAsset}
              label={translate('trade.youPay')}
            />
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
              percentOptions={[1]}
              showInputSkeleton={isLoading}
              showFiatSkeleton={isLoading}
              label={translate('trade.youGet')}
              rightRegion={
                activeQuote ? (
                  <IconButton
                    size='sm'
                    icon={showTradeQuotes ? <ArrowUpIcon /> : <ArrowDownIcon />}
                    aria-label='Expand Quotes'
                    onClick={toggleShowTradeQuotes}
                  />
                ) : (
                  <></>
                )
              }
            >
              {Boolean(sortedQuotes.length) && (
                <TradeQuotes isOpen={showTradeQuotes} sortedQuotes={sortedQuotes ?? []} />
              )}
            </TradeAssetInput>
          </Stack>
          <Stack
            boxShadow='sm'
            p={4}
            borderColor={useColorModeValue('gray.100', 'gray.750')}
            borderRadius='xl'
            borderWidth={1}
          >
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
                slippage={
                  activeQuote.recommendedSlippage ??
                  getDefaultSlippagePercentageForSwapper(activeSwapperName)
                }
                swapperName={activeSwapperName ?? ''}
              />
            ) : null}
          </Stack>
          <Stack px={4}>
            <DonationCheckbox isLoading={isLoading} />
            {activeQuote && <ManualAddressEntry />}
          </Stack>
          <Tooltip label={activeQuoteStatus.error?.message ?? activeQuoteStatus.quoteErrors[0]}>
            <Button
              type='submit'
              colorScheme={quoteHasError ? 'red' : 'blue'}
              size='lg-multiline'
              data-test='trade-form-preview-button'
              isDisabled={shouldDisablePreviewButton}
              isLoading={isLoading}
            >
              <Text translation={activeQuoteStatus.quoteStatusTranslation} />
            </Button>
          </Tooltip>
        </Stack>
      </SlideTransition>
    </MessageOverlay>
  )
}
