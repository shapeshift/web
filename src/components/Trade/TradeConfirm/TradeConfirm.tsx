import { Alert } from '@chakra-ui/alert'
import { WarningTwoIcon } from '@chakra-ui/icons'
import {
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Divider,
  Flex,
  Link,
  Stack,
  StackDivider,
  useColorModeValue,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { fromAccountId, osmosisAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import type { Swapper } from '@shapeshiftoss/swapper'
import { type TradeTxs, SwapperName } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { useHistory } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { getSwapperManager } from 'components/Trade/hooks/useSwapper/swapperManager'
import { useFrozenTradeValues } from 'components/Trade/TradeConfirm/useFrozenTradeValues'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal, fromBaseUnit } from 'lib/math'
import { poll } from 'lib/poll/poll'
import {
  selectAssetById,
  selectFeatureFlags,
  selectFeeAssetByChainId,
  selectFiatToUsdRate,
  selectTxStatusById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import type { TS } from '../types'
import { TradeRoutePaths } from '../types'
import { WithBackButton } from '../WithBackButton'
import { AssetToAsset } from './AssetToAsset'
import { ReceiveSummary } from './ReceiveSummary'

export const TradeConfirm = () => {
  const history = useHistory()
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const warningColor = useColorModeValue('red.600', 'red.400')
  const [sellTxid, setSellTxid] = useState('')
  const [buyTxid, setBuyTxid] = useState('')
  const {
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useFormContext<TS>()
  const translate = useTranslate()
  const osmosisAsset = useAppSelector(state => selectAssetById(state, osmosisAssetId))
  const [swapper, setSwapper] = useState<Swapper<ChainId>>()
  const flags = useSelector(selectFeatureFlags)

  const {
    number: { toFiat },
  } = useLocaleFormatter()

  const {
    state: { isConnected, wallet },
    dispatch,
  } = useWallet()

  const {
    tradeAmounts,
    trade,
    fees,
    feeAssetFiatRate,
    slippage,
    buyAssetAccountId,
    sellAssetAccountId,
    buyTradeAsset,
  } = useFrozenTradeValues()

  const defaultFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, trade?.sellAsset?.chainId ?? ''),
  )

  const reset = useCallback(() => {
    setValue('buyTradeAsset.amount', '')
    setValue('sellTradeAsset.amount', '')
    setValue('fiatSellAmount', '')
  }, [setValue])

  const parsedBuyTxId = useMemo(() => {
    const isThorTrade = [trade?.sellAsset.assetId, trade?.buyAsset.assetId].includes(
      thorchainAssetId,
    )

    if (isThorTrade) {
      // swapper getTradeTxs monkey patches Thor buyTxId using the sellAssetId, since we can't get the outbound Tx
      // while this says "buyTxid`, it really is the sellAssetId, so we need to serialize to a Tx containing the sell data
      // e.g sell asset AccountId, and sell asset address, and sell Txid
      // If we use the "real" (which we never get) buy Tx AccountId and address. then we'll never be able to lookup a Tx in state
      // and thus will never be able to react on the completed state
      return serializeTxIndex(
        sellAssetAccountId!,
        buyTxid.toUpperCase(), // Midgard monkey patch Txid is lowercase, but we store Cosmos SDK Txs uppercase
        fromAccountId(sellAssetAccountId!).account ?? '',
      )
    }

    return serializeTxIndex(buyAssetAccountId!, buyTxid, trade?.receiveAddress ?? '')
  }, [
    sellAssetAccountId,
    trade?.buyAsset.assetId,
    trade?.sellAsset.assetId,
    buyAssetAccountId,
    trade?.receiveAddress,
    buyTxid,
  ])

  useEffect(() => {
    ;(async () => {
      const buyAssetId = trade?.buyAsset.assetId
      const sellAssetId = trade?.sellAsset.assetId
      if (!buyAssetId || !sellAssetId) return ''
      const swapperManager = await getSwapperManager(flags)
      const bestSwapper = await swapperManager.getBestSwapper({ buyAssetId, sellAssetId })
      setSwapper(bestSwapper)
    })()
  }, [flags, trade])

  const status =
    useAppSelector(state => selectTxStatusById(state, parsedBuyTxId)) ?? TxStatus.Pending

  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  const txLink = useMemo(() => {
    switch (trade?.sources[0]?.name) {
      case SwapperName.Osmosis:
        return `${osmosisAsset?.explorerTxLink}${sellTxid}`
      case SwapperName.CowSwap:
        return `https://explorer.cow.fi/orders/${sellTxid}`
      case SwapperName.Thorchain:
        return `https://v2.viewblock.io/thorchain/tx/${sellTxid}`
      default:
        return `${trade?.sellAsset?.explorerTxLink}${sellTxid}`
    }
  }, [trade, sellTxid, osmosisAsset])

  const { showErrorToast } = useErrorHandler()

  // This should not happen, but it could.
  if (!trade) throw new Error('Trade is undefined')

  const onSubmit = async () => {
    try {
      if (!isConnected || !swapper || !wallet) {
        /**
         * call handleBack to reset current form state
         * before opening the connect wallet modal.
         */
        handleBack()
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      const result = await swapper.executeTrade({ trade, wallet })
      setSellTxid(result.tradeId)

      // Poll until we have a "buy" txid
      // This means the trade is just about finished
      const txs = await poll({
        fn: async () => {
          try {
            return { ...(await swapper.getTradeTxs(result)) }
          } catch (e) {
            return { sellTxid: '', buyTxid: '', e }
          }
        },
        validate: (txs: TradeTxs & { e: Error }) => !!txs.buyTxid || !!txs.e,
        interval: 10000, // 10 seconds
        maxAttempts: 300, // Lots of attempts because some trade are slow (thorchain to bitcoin)
      })
      if (txs.e) throw txs.e
      setBuyTxid(txs.buyTxid ?? '')
    } catch (e) {
      showErrorToast(e)
      reset()
      setSellTxid('')
      history.push(TradeRoutePaths.Input)
    }
  }

  const handleBack = useCallback(() => {
    if (sellTxid) {
      reset()
    }
    history.push(TradeRoutePaths.Input)
  }, [history, reset, sellTxid])

  const networkFeeFiat = bnOrZero(fees?.networkFeeCryptoHuman)
    .times(feeAssetFiatRate ?? 1)
    .times(selectedCurrencyToUsdRate)

  // Ratio of the fiat value of the gas fee to the fiat value of the trade value express in percentage
  const networkFeeToTradeRatioPercentage = networkFeeFiat
    .dividedBy(tradeAmounts?.sellAmountBeforeFeesFiat ?? 1)
    .times(100)
    .toNumber()
  const networkFeeToTradeRatioPercentageThreshold = 5
  const isFeeRatioOverThreshold =
    networkFeeToTradeRatioPercentage > networkFeeToTradeRatioPercentageThreshold

  const header: JSX.Element = useMemo(
    () => (
      <>
        <Card.Header px={0} pt={0}>
          <WithBackButton handleBack={handleBack}>
            <Card.Heading textAlign='center'>
              <Text
                translation={
                  status === TxStatus.Confirmed ? 'trade.complete' : 'trade.confirmDetails'
                }
              />
            </Card.Heading>
          </WithBackButton>
        </Card.Header>
        <Divider />
      </>
    ),
    [handleBack, status],
  )

  const tradeWarning: JSX.Element | null = useMemo(() => {
    const tradeWarningElement = (
      <Flex direction='column' gap={2}>
        {fees?.tradeFeeSource === 'Thorchain' && (
          <Alert status='info' width='auto' fontSize='sm'>
            <AlertIcon />
            <Stack spacing={0}>
              <AlertTitle>{translate('trade.slowSwapTitle', { protocol: 'THORChain' })}</AlertTitle>
              <AlertDescription lineHeight='short'>
                {translate('trade.slowSwapBody')}
              </AlertDescription>
            </Stack>
          </Alert>
        )}
        {trade.buyAsset.assetId === thorchainAssetId && (
          <Alert status='info' width='auto' mb={3} fontSize='sm'>
            <AlertIcon />
            <Stack spacing={0}>
              <AlertDescription lineHeight='short'>
                {translate('trade.intoRUNEBody')}
              </AlertDescription>
            </Stack>
          </Alert>
        )}
      </Flex>
    )
    const shouldRenderWarnings = tradeWarningElement.props?.children?.some(
      (child: JSX.Element | false) => !!child,
    )
    return shouldRenderWarnings ? tradeWarningElement : null
  }, [fees?.tradeFeeSource, trade.buyAsset.assetId, translate])

  const sendReceiveSummary: JSX.Element = useMemo(
    () => (
      <Stack spacing={4}>
        <Row>
          <Row.Label>{translate('common.send')}</Row.Label>
          <Row.Value textAlign='right'>
            <Amount.Crypto
              value={
                fromBaseUnit(
                  tradeAmounts?.sellAmountBeforeFeesBaseUnit ?? '',
                  trade.sellAsset.precision,
                ) ?? ''
              }
              symbol={trade.sellAsset.symbol}
            />
            <Amount.Fiat
              color='gray.500'
              value={tradeAmounts?.sellAmountBeforeFeesFiat ?? ''}
              prefix='≈'
            />
          </Row.Value>
        </Row>
        <ReceiveSummary
          symbol={trade.buyAsset.symbol ?? ''}
          amount={buyTradeAsset?.amount ?? ''}
          beforeFees={tradeAmounts?.beforeFeesBuyAsset ?? ''}
          protocolFee={tradeAmounts?.totalTradeFeeBuyAsset ?? ''}
          shapeShiftFee='0'
          slippage={slippage}
          fiatAmount={tradeAmounts?.buyAmountAfterFeesFiat ?? ''}
          swapperName={swapper?.name ?? ''}
        />
      </Stack>
    ),
    [
      buyTradeAsset?.amount,
      slippage,
      swapper?.name,
      trade.buyAsset.symbol,
      trade.sellAsset.precision,
      trade.sellAsset.symbol,
      tradeAmounts?.beforeFeesBuyAsset,
      tradeAmounts?.buyAmountAfterFeesFiat,
      tradeAmounts?.sellAmountBeforeFeesBaseUnit,
      tradeAmounts?.sellAmountBeforeFeesFiat,
      tradeAmounts?.totalTradeFeeBuyAsset,
      translate,
    ],
  )

  const footer: JSX.Element = useMemo(
    () => (
      <Card.Footer px={0} py={0}>
        {!sellTxid && !isSubmitting && (
          <Button
            colorScheme='blue'
            size='lg'
            width='full'
            mt={6}
            data-test='trade-form-confirm-and-trade-button'
            type='submit'
          >
            <Text translation='trade.confirmAndTrade' />
          </Button>
        )}
      </Card.Footer>
    ),
    [isSubmitting, sellTxid],
  )

  return (
    <SlideTransition>
      <Box as='form' onSubmit={handleSubmit(onSubmit)}>
        <Card variant='unstyled'>
          {header}
          <Card.Body pb={0} px={0}>
            <Stack
              spacing={4}
              borderColor={borderColor}
              divider={<StackDivider />}
              fontSize='sm'
              fontWeight='medium'
            >
              <AssetToAsset
                buyIcon={trade.buyAsset.icon}
                sellIcon={trade.sellAsset.icon}
                buyColor={trade.buyAsset.color}
                sellColor={trade.sellAsset.color}
                status={sellTxid || isSubmitting ? status : undefined}
              />
              {tradeWarning}
              {sendReceiveSummary}
              <Stack spacing={4}>
                {sellTxid && (
                  <Row>
                    <Row.Label>
                      <RawText>{translate('common.txId')}</RawText>
                    </Row.Label>
                    <Box textAlign='right'>
                      <Link isExternal color='blue.500' href={txLink}>
                        <Text translation='trade.viewTransaction' />
                      </Link>
                    </Box>
                  </Row>
                )}
                <Row>
                  <HelperTooltip label={translate('trade.tooltip.rate')}>
                    <Row.Label>
                      <Text translation='trade.rate' />
                    </Row.Label>
                  </HelperTooltip>
                  <Box textAlign='right'>
                    <RawText>{`1 ${trade.sellAsset.symbol} = ${firstNonZeroDecimal(
                      bnOrZero(trade.rate),
                    )} ${trade.buyAsset?.symbol}`}</RawText>
                    {!!fees?.tradeFeeSource && (
                      <RawText color='gray.500'>@{fees?.tradeFeeSource}</RawText>
                    )}
                  </Box>
                </Row>
                <Row>
                  <HelperTooltip label={translate('trade.tooltip.minerFee')}>
                    <Row.Label>
                      <Text translation='trade.minerFee' />
                    </Row.Label>
                  </HelperTooltip>
                  <Row.Value>
                    {defaultFeeAsset &&
                      `${bnOrZero(fees?.networkFeeCryptoHuman).toNumber()} ${
                        defaultFeeAsset.symbol
                      } ≃ ${toFiat(networkFeeFiat.toNumber())}`}
                  </Row.Value>
                </Row>
                {isFeeRatioOverThreshold && (
                  <Flex justifyContent='center' gap={4} alignItems='center'>
                    <WarningTwoIcon w={5} h={5} color={warningColor} />
                    <Text
                      color={warningColor}
                      translation={[
                        'trade.gasFeeExceedsTradeAmountThreshold',
                        { percentage: networkFeeToTradeRatioPercentage.toFixed(0) },
                      ]}
                    />
                  </Flex>
                )}
              </Stack>
            </Stack>
          </Card.Body>
          {footer}
        </Card>
      </Box>
    </SlideTransition>
  )
}
