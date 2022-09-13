import { WarningTwoIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  Flex,
  Link,
  Stack,
  StackDivider,
  useColorModeValue,
} from '@chakra-ui/react'
import { osmosisAssetId } from '@shapeshiftoss/caip'
import { type TradeTxs, isCowTrade } from '@shapeshiftoss/swapper'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { type RouterProps, useLocation } from 'react-router-dom'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { WalletActions } from 'context/WalletProvider/actions'
import { useErrorHandler } from 'hooks/useErrorToast/useErrorToast'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bn, bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal, fromBaseUnit } from 'lib/math'
import { poll } from 'lib/poll/poll'
import {
  selectAssetById,
  selectFiatToUsdRate,
  selectFirstAccountSpecifierByChainId,
  selectTxStatusById,
} from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

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
    buyAssetFiatRate,
    slippage,
  }: Pick<TS, 'trade' | 'fees' | 'sellAssetFiatRate' | 'buyAssetFiatRate' | 'slippage'> =
    getValues()
  const { executeQuote, reset, getTradeTxs } = useSwapper()
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
  const buyAssetChainId = trade?.buyAsset.chainId
  const buyAssetAccountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, buyAssetChainId ?? ''),
  )

  const parsedBuyTxId = useMemo(
    () => serializeTxIndex(buyAssetAccountSpecifier, buyTxid, trade?.receiveAddress ?? ''),
    [buyAssetAccountSpecifier, trade?.receiveAddress, buyTxid],
  )

  const status =
    useAppSelector(state => selectTxStatusById(state, parsedBuyTxId)) ?? TxStatus.Pending

  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  const txLink = useMemo(() => {
    switch (trade?.sources[0].name) {
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
    bnOrZero(trade?.sellAmount),
    trade?.sellAsset?.precision ?? 0,
  )

  const sellAmountFiat = bnOrZero(sellAmountCrypto)
    .times(bnOrZero(sellAssetFiatRate))
    .times(selectedCurrencyToUsdRate)

  const buyAmountCryptoBeforeFees = fromBaseUnit(
    bnOrZero(trade?.buyAmount),
    trade?.buyAsset?.precision ?? 0,
  )
  const buyAmountCryptoAfterFees = fromBaseUnit(
    bnOrZero(trade?.buyAmount).minus(bnOrZero(fees?.tradeFee)),
    trade?.buyAsset?.precision ?? 0,
  )

  const buyAmountFiat = bnOrZero(buyAmountCryptoBeforeFees)
    .times(bnOrZero(buyAssetFiatRate))
    .times(selectedCurrencyToUsdRate)

  const feeAmountFiat = bnOrZero(fees?.fee).times(fiatRate).times(selectedCurrencyToUsdRate)

  // Ratio of the fiat value of the gas fee to the fiat value of the trade value express in percentage
  const gasFeeToTradeRatioPercentage = feeAmountFiat.dividedBy(sellAmountFiat).times(100).toNumber()
  const gasFeeToTradeRatioPercentageThreshold = 5
  const isFeeRatioOverThreshold =
    gasFeeToTradeRatioPercentage > gasFeeToTradeRatioPercentageThreshold

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
              <Stack spacing={4}>
                <Row>
                  <Row.Label>{translate('common.send')}</Row.Label>
                  <Row.Value textAlign='right'>
                    <Amount.Crypto value={sellAmountCrypto} symbol={trade.sellAsset.symbol} />
                    <Amount.Fiat color='gray.500' value={sellAmountFiat.toString()} prefix='≈' />
                  </Row.Value>
                </Row>
                <ReceiveSummary
                  symbol={trade.buyAsset.symbol ?? ''}
                  amount={buyAmountCryptoAfterFees}
                  fiatAmount={buyAmountFiat.toString()}
                  beforeFees={buyAmountCryptoBeforeFees}
                  protocolFee={fees?.tradeFee}
                  shapeShiftFee='0'
                  slippage={slippage}
                />
              </Stack>
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
                      bnOrZero(trade?.rate),
                    )} ${trade?.buyAsset?.symbol}`}</RawText>
                    {!!fees?.tradeFeeSource && (
                      <RawText color='gray.500'>@{fees?.tradeFeeSource}</RawText>
                    )}
                  </Box>
                </Row>
                {isCowTrade(trade) && (
                  <Row>
                    <HelperTooltip label={translate('trade.tooltip.protocolFee')}>
                      <Row.Label>
                        <Text translation='trade.protocolFee' />
                      </Row.Label>
                    </HelperTooltip>
                    <Row.Value>
                      {bn(trade.feeAmountInSellToken)
                        .div(bn(10).pow(trade.sellAsset.precision))
                        .decimalPlaces(6)
                        .toString()}{' '}
                      ≃{' '}
                      {toFiat(
                        bn(trade.feeAmountInSellToken)
                          .div(bn(10).pow(trade.sellAsset.precision))
                          .times(sellAssetFiatRate)
                          .times(selectedCurrencyToUsdRate)
                          .toString(),
                      )}
                    </Row.Value>
                  </Row>
                )}
                <Row>
                  <HelperTooltip label={translate('trade.tooltip.minerFee')}>
                    <Row.Label>
                      <Text translation='trade.minerFee' />
                    </Row.Label>
                  </HelperTooltip>
                  <Row.Value>
                    {bnOrZero(fees?.fee).toNumber()} ≃ {toFiat(feeAmountFiat.toNumber())}
                  </Row.Value>
                </Row>
                {isFeeRatioOverThreshold && (
                  <Flex justifyContent='space-evenly' alignItems='center'>
                    <WarningTwoIcon w={5} h={5} color='red.400' />
                    <Text
                      color='red.400'
                      translation={[
                        'trade.gasFeeExceedsTradeAmountThreshold',
                        { percentage: gasFeeToTradeRatioPercentage.toFixed(0) },
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
