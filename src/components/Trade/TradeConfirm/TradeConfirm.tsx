import { Alert } from '@chakra-ui/alert'
import { WarningTwoIcon } from '@chakra-ui/icons'
import {
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Divider,
  Flex,
  Link,
  Stack,
  StackDivider,
  useColorModeValue,
} from '@chakra-ui/react'
import { Button } from '@chakra-ui/react'
import { fromAccountId, osmosisAssetId, thorchainAssetId } from '@keepkey/caip'
import { type TradeTxs } from '@keepkey/swapper'
import { TxStatus } from '@keepkey/unchained-client'
import { useEffect, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { type RouterProps, useLocation } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import type { getTradeAmountConstants } from 'components/Trade/hooks/useGetTradeAmounts'
import { useGetTradeAmounts } from 'components/Trade/hooks/useGetTradeAmounts'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal, fromBaseUnit } from 'lib/math'
import { poll } from 'lib/poll/poll'
import { selectFeatureFlags } from 'state/slices/preferencesSlice/selectors'
import {
  selectAssetById,
  selectFeeAssetByChainId,
  selectFiatToUsdRate,
  selectTxStatusById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import { getSwapperManager } from '../hooks/useSwapper/swapperManager'
import type { TS } from '../types'
import { TradeRoutePaths } from '../types'
import { WithBackButton } from '../WithBackButton'
import { AssetToAsset } from './AssetToAsset'
import { ReceiveSummary } from './ReceiveSummary'

type TradeConfirmParams = {
  fiatRate: string
}

export const TradeConfirm = ({ history }: RouterProps) => {
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const [sellTxid, setSellTxid] = useState('')
  const [buyTxid, setBuyTxid] = useState('')
  const flags = useSelector(selectFeatureFlags)
  const [swapperName, setSwapperName] = useState<string>('')
  const [executedTradeAmountConstants, setExecutedTradeAmountConstants] =
    useState<ReturnType<typeof getTradeAmountConstants>>()
  const {
    getValues,
    handleSubmit,
    formState: { isSubmitting },
  } = useFormContext<TS>()
  const translate = useTranslate()
  const osmosisAsset = useAppSelector(state => selectAssetById(state, osmosisAssetId))
  const {
    trade,
    fees,
    sellAssetFiatRate,
    slippage,
    buyAssetAccountId,
    sellAssetAccountId,
    buyTradeAsset,
  }: Pick<
    TS,
    | 'sellAssetAccountId'
    | 'buyAssetAccountId'
    | 'trade'
    | 'fees'
    | 'sellAssetFiatRate'
    | 'slippage'
    | 'buyTradeAsset'
  > = getValues()
  const { executeQuote, reset, getTradeTxs } = useSwapper()
  const tradeAmountConstants = useGetTradeAmounts()
  const location = useLocation<TradeConfirmParams>()
  // TODO: Refactor to use fiatRate from TradeState - we don't need to pass fiatRate around.
  const { fiatRate } = location.state
  const {
    number: { toFiat },
  } = useLocaleFormatter()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()

  const defaultFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, trade?.sellAsset?.chainId ?? ''),
  )

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
      setSwapperName(bestSwapper?.name ?? '')
    })()
  }, [flags, trade])

  const status =
    useAppSelector(state => selectTxStatusById(state, parsedBuyTxId)) ?? TxStatus.Pending

  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  const txLink = useMemo(() => {
    switch (trade?.sources[0]?.name) {
      case 'Osmosis':
        return `${osmosisAsset?.explorerTxLink}${sellTxid}`
      case 'CowSwap':
        return `https://explorer.cow.fi/orders/${sellTxid}`
      default:
        return `${trade?.sellAsset?.explorerTxLink}${sellTxid}`
    }
  }, [trade, sellTxid, osmosisAsset])

  const { showErrorToast } = useErrorHandler()

  // This should not happen, but it could.
  if (!trade) throw new Error('Trade is undefined')

  const onSubmit = async () => {
    try {
      if (!isConnected) {
        /**
         * call handleBack to reset current form state
         * before opening the connect wallet modal.
         */
        handleBack()
        dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
        return
      }

      setExecutedTradeAmountConstants(tradeAmountConstants)

      const result = await executeQuote()
      setSellTxid(result.tradeId)

      // Poll until we have a "buy" txid
      // This means the trade is just about finished
      const txs = await poll({
        fn: async () => {
          try {
            return { ...(await getTradeTxs(result)) }
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

  const handleBack = () => {
    if (sellTxid) {
      reset()
    }
    history.push(TradeRoutePaths.Input)
  }

  const sellAmountCrypto = fromBaseUnit(
    bnOrZero(trade.sellAmountCryptoPrecision),
    trade?.sellAsset?.precision ?? 0,
  )

  const sellAmountFiat = bnOrZero(sellAmountCrypto)
    .times(bnOrZero(sellAssetFiatRate))
    .times(selectedCurrencyToUsdRate)

  const networkFeeFiat = bnOrZero(fees?.networkFeeCryptoHuman)
    .times(fiatRate)
    .times(selectedCurrencyToUsdRate)

  // Ratio of the fiat value of the gas fee to the fiat value of the trade value express in percentage
  const networkFeeToTradeRatioPercentage = networkFeeFiat
    .dividedBy(sellAmountFiat)
    .times(100)
    .toNumber()
  const networkFeeToTradeRatioPercentageThreshold = 5
  const isFeeRatioOverThreshold =
    networkFeeToTradeRatioPercentage > networkFeeToTradeRatioPercentageThreshold

  return (
    <SlideTransition>
      <Box as='form' onSubmit={handleSubmit(onSubmit)}>
        <Card variant='unstyled'>
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
                status={sellTxid || isSubmitting ? status : undefined}
              />
              <Flex direction='column' gap={2}>
                {fees?.tradeFeeSource === 'Thorchain' && (
                  <Alert status='info' width='auto' fontSize='sm'>
                    <AlertIcon />
                    <Stack spacing={0}>
                      <AlertTitle>
                        {translate('trade.slowSwapTitle', { protocol: 'THORChain' })}
                      </AlertTitle>
                      <AlertDescription lineHeight='short'>
                        {translate('trade.slowSwapBody')}
                      </AlertDescription>
                    </Stack>
                  </Alert>
                )}
                {trade?.buyAsset.assetId === thorchainAssetId && (
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
              <Stack spacing={4}>
                <Row colorScheme={undefined}>
                  <Row.Label>{translate('common.send')}</Row.Label>
                  <Row.Value textAlign='right'>
                    <Amount.Crypto value={sellAmountCrypto} symbol={trade.sellAsset.symbol} />
                    <Amount.Fiat color='gray.500' value={sellAmountFiat.toString()} prefix='≈' />
                  </Row.Value>
                </Row>
                <ReceiveSummary
                  symbol={trade.buyAsset.symbol ?? ''}
                  amount={buyTradeAsset?.amount ?? ''}
                  beforeFees={
                    executedTradeAmountConstants?.beforeFeesBuyAsset ??
                    tradeAmountConstants?.beforeFeesBuyAsset ??
                    ''
                  }
                  protocolFee={
                    executedTradeAmountConstants?.totalTradeFeeBuyAsset ??
                    tradeAmountConstants?.totalTradeFeeBuyAsset ??
                    ''
                  }
                  shapeShiftFee='0'
                  slippage={slippage}
                  swapperName={swapperName}
                  colorScheme={undefined}
                />
              </Stack>
              <Stack spacing={4}>
                {sellTxid && (
                  <Row colorScheme={undefined}>
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
                <Row colorScheme={undefined}>
                  <HelperTooltip label={translate('trade.tooltip.rate')}>
                    <Row.Label>
                      <Text translation='trade.rate' />
                    </Row.Label>
                  </HelperTooltip>
                  <Box textAlign='right'>
                    <RawText>{`1 ${trade.sellAsset.symbol} = ${firstNonZeroDecimal(
                      bnOrZero(trade?.rate),
                    )} ${trade?.buyAsset?.symbol}`}</RawText>
                    {!!fees?.tradeFeeSource && (
                      <RawText color='gray.500'>@{fees?.tradeFeeSource}</RawText>
                    )}
                  </Box>
                </Row>
                <Row colorScheme={undefined}>
                  <HelperTooltip label={translate('trade.tooltip.minerFee')}>
                    <Row.Label>
                      <Text translation='trade.minerFee' />
                    </Row.Label>
                  </HelperTooltip>
                  <Row.Value>
                    {bnOrZero(fees?.networkFeeCryptoHuman).toNumber()} {defaultFeeAsset.symbol} ≃{' '}
                    {toFiat(networkFeeFiat.toNumber())}
                  </Row.Value>
                </Row>
                {isFeeRatioOverThreshold && (
                  <Flex justifyContent='center' gap={4} alignItems='center'>
                    <WarningTwoIcon w={5} h={5} color='red.400' />
                    <Text
                      color='red.400'
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
        </Card>
      </Box>
    </SlideTransition>
  )
}
