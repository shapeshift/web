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
import { useCallback, useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import type { CardProps } from 'components/Card/Card'
import { Card } from 'components/Card/Card'
import { MessageOverlay } from 'components/MessageOverlay/MessageOverlay'
import { TradeQuotes } from 'components/MultiHopTrade/components/TradeQuotes/TradeQuotes'
import { useGetTradeQuotes } from 'components/MultiHopTrade/hooks/useGetTradeQuotes'
import { useSelectedQuoteStatus } from 'components/MultiHopTrade/hooks/useSelectedQuoteStatus'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { TradeAssetSelect } from 'components/Trade/Components/AssetSelection'
import { RateGasRow } from 'components/Trade/Components/RateGasRow'
import { TradeAssetInput } from 'components/Trade/Components/TradeAssetInput'
import { ReceiveSummary } from 'components/Trade/TradeConfirm/ReceiveSummary'
import { useModal } from 'hooks/useModal/useModal'
import { useToggle } from 'hooks/useToggle/useToggle'
import { useWallet } from 'hooks/useWallet/useWallet'
import type { Asset } from 'lib/asset-service'
import { fromBaseUnit } from 'lib/math'
import { SwapperName } from 'lib/swapper/api'
import { selectSwappersApiTradeQuotePending } from 'state/apis/swappers/selectors'
import { selectBuyAsset, selectSellAsset } from 'state/slices/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import {
  selectNetReceiveAmountCryptoPrecision,
  selectSelectedQuote,
  selectSelectedQuoteError,
  selectSelectedSwapperName,
  selectSwapperSupportsCrossAccountTrade,
  selectTotalProtocolFeeByAsset,
} from 'state/slices/tradeQuoteSlice/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { SellAssetInput } from './components/SellAssetInput'
import { TradeConfirm } from './components/TradeConfirm/TradeConfirm'
import { useAccountIds } from './hooks/useAccountIds'
import { useSupportedAssets } from './hooks/useSupportedAssets'

export const MultiHopTrade = (props: CardProps) => {
  useGetTradeQuotes()
  const {
    state: { wallet },
  } = useWallet()
  const dispatch = useAppDispatch()
  const [showTradeQuotes, toggleShowTradeQuotes] = useToggle(false)
  const isKeplr = useMemo(() => wallet instanceof KeplrHDWallet, [wallet])
  const methods = useForm({ mode: 'onChange' })
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const { assetSearch } = useModal()
  const buyAsset = useAppSelector(selectBuyAsset)
  const sellAsset = useAppSelector(selectSellAsset)
  const swapperSupportsCrossAccountTrade = useAppSelector(selectSwapperSupportsCrossAccountTrade)
  const totalProtocolFees = useAppSelector(selectTotalProtocolFeeByAsset)
  const buyAmountAfterFeesCryptoPrecision = useAppSelector(selectNetReceiveAmountCryptoPrecision)

  const selectedQuoteStatus = useSelectedQuoteStatus()
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

  const { supportedSellAssets, supportedBuyAssets } = useSupportedAssets()
  const selectedSwapperName = useAppSelector(selectSelectedSwapperName)
  const selectedQuote = useAppSelector(selectSelectedQuote)
  const selectedQuoteError = useAppSelector(selectSelectedQuoteError)
  const isLoading = useAppSelector(selectSwappersApiTradeQuotePending)

  const { sellAssetAccountId, buyAssetAccountId, setSellAssetAccountId, setBuyAssetAccountId } =
    useAccountIds({
      buyAsset,
      sellAsset,
    })
  const translate = useTranslate()
  const overlayTitle = useMemo(
    () => translate('trade.swappingComingSoonForWallet', { walletName: 'Keplr' }),
    [translate],
  )

  const handleSellAssetClick = useCallback(() => {
    assetSearch.open({
      onClick: setSellAsset,
      title: 'trade.tradeFrom',
      assets: supportedSellAssets,
    })
  }, [assetSearch, setSellAsset, supportedSellAssets])

  const handleBuyAssetClick = useCallback(() => {
    assetSearch.open({
      onClick: setBuyAsset,
      title: 'trade.tradeTo',
      assets: supportedBuyAssets,
    })
  }, [assetSearch, setBuyAsset, supportedBuyAssets])

  const buyAmountBeforeFeesCryptoPrecision = useMemo(() => {
    if (!selectedQuote) return '0'
    const lastStep = selectedQuote.steps[selectedQuote.steps.length - 1]
    return fromBaseUnit(lastStep.buyAmountBeforeFeesCryptoBaseUnit, buyAsset.precision)
  }, [buyAsset.precision, selectedQuote])

  const quoteHasError = useMemo(() => {
    return selectedQuoteStatus.validationErrors.length > 0
  }, [selectedQuoteStatus.validationErrors])

  return (
    <MessageOverlay show={isKeplr} title={overlayTitle}>
      {selectedQuote && (
        <TradeConfirm
          tradeQuote={selectedQuote}
          swapperName={selectedSwapperName ?? SwapperName.Thorchain}
        /> // fixme
      )}
      <Card flex={1} {...props}>
        <FormProvider {...methods}>
          <SlideTransition>
            <Stack spacing={6} as='form' onSubmit={() => {}}>
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
                    accountSelectionDisabled={swapperSupportsCrossAccountTrade}
                    label={translate('trade.to')}
                  />
                </Flex>
                <SellAssetInput
                  accountId={sellAssetAccountId}
                  asset={sellAsset}
                  label={translate('trade.youPay')}
                  onClickSendMax={() => {}}
                />
                <TradeAssetInput
                  isReadOnly={true}
                  accountId={buyAssetAccountId}
                  assetId={buyAsset.assetId}
                  assetSymbol={buyAsset.symbol}
                  assetIcon={buyAsset.icon}
                  cryptoAmount={buyAmountAfterFeesCryptoPrecision}
                  fiatAmount={'1.234'}
                  percentOptions={[1]}
                  showInputSkeleton={isLoading}
                  showFiatSkeleton={isLoading}
                  label={translate('trade.youGet')}
                  rightRegion={
                    selectedQuote ? (
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
                  {selectedQuote && <TradeQuotes isOpen={showTradeQuotes} />}
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
                  sellSymbol={''}
                  buySymbol={''}
                  gasFee={'0'}
                  rate={undefined}
                  isLoading={isLoading}
                  isError={selectedQuoteError !== undefined}
                />
                {selectedQuote ? (
                  <ReceiveSummary
                    isLoading={isLoading}
                    symbol={buyAsset.symbol}
                    amountCryptoPrecision={buyAmountAfterFeesCryptoPrecision ?? '0'}
                    amountBeforeFeesCryptoPrecision={buyAmountBeforeFeesCryptoPrecision}
                    protocolFees={totalProtocolFees}
                    shapeShiftFee='0'
                    slippage={
                      selectedQuote.recommendedSlippage ??
                      getDefaultSlippagePercentageForSwapper(selectedSwapperName)
                    }
                    swapperName={selectedSwapperName ?? ''}
                  />
                ) : null}
              </Stack>
              <Tooltip label={selectedQuoteStatus.error?.message}>
                <Button
                  type='submit'
                  colorScheme={quoteHasError ? 'red' : 'blue'}
                  size='lg-multiline'
                  data-test='trade-form-preview-button'
                  isDisabled={quoteHasError}
                  isLoading={isLoading}
                >
                  <Text translation={selectedQuoteStatus.quoteStatusTranslation} />
                </Button>
              </Tooltip>
            </Stack>
          </SlideTransition>
        </FormProvider>
      </Card>
    </MessageOverlay>
  )
}
