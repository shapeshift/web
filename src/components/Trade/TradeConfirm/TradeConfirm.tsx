import { WarningTwoIcon } from '@chakra-ui/icons'
import { Box, Button, Divider, Flex, Link, Stack } from '@chakra-ui/react'
import { osmosisAssetId } from '@shapeshiftoss/caip'
import { TradeTxs } from '@shapeshiftoss/swapper'
import { KnownChainIds } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { RouterProps, useLocation } from 'react-router-dom'
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
import { bnOrZero } from 'lib/bignumber/bignumber'
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

import { TradeRoutePaths, TradeState } from '../types'
import { WithBackButton } from '../WithBackButton'
import { AssetToAsset } from './AssetToAsset'

type TradeConfirmParams = {
  fiatRate: string
}

export const TradeConfirm = ({ history }: RouterProps) => {
  const [txid, setTxid] = useState('')
  const {
    getValues,
    handleSubmit,
    formState: { isSubmitting },
  } = useFormContext<TradeState<KnownChainIds>>()
  const translate = useTranslate()
  const osmosisAsset = useAppSelector(state => selectAssetById(state, osmosisAssetId))
  const { trade, fees, sellAssetFiatRate, buyAssetFiatRate } = getValues()
  const { executeQuote, reset, getTradeTxs } = useSwapper()
  const location = useLocation<TradeConfirmParams>()
  const { fiatRate } = location.state
  const {
    number: { toFiat },
  } = useLocaleFormatter()
  const {
    state: { isConnected },
    dispatch,
  } = useWallet()
  const { chainId: buyAssetChainId } = trade.buyAsset
  const buyAssetAccountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, buyAssetChainId),
  )

  const parsedTxId = useMemo(
    () => serializeTxIndex(buyAssetAccountSpecifier, txid, trade.receiveAddress),
    [buyAssetAccountSpecifier, trade.receiveAddress, txid],
  )
  const status = useAppSelector(state => selectTxStatusById(state, parsedTxId))

  const { showErrorToast } = useErrorHandler()

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
      if (!txs?.sellTxid) throw new Error('No sellTxid from getTradeTxs')
      setTxid(txs.sellTxid)
    } catch (e) {
      showErrorToast(e)
      reset()
      setTxid('')
      history.push(TradeRoutePaths.Input)
    }
  }

  const handleBack = () => {
    if (txid) {
      reset()
    }
    history.push(TradeRoutePaths.Input)
  }

  const selectedCurrencyToUsdRate = useAppSelector(selectFiatToUsdRate)

  const tradeFiatAmount = toFiat(
    bnOrZero(fromBaseUnit(bnOrZero(trade?.sellAmount), trade?.sellAsset.precision ?? 0))
      .times(bnOrZero(sellAssetFiatRate))
      .times(selectedCurrencyToUsdRate)
      .toNumber(),
  )
  const feeFiatValue = bnOrZero(fees?.fee).times(fiatRate).times(selectedCurrencyToUsdRate)

  const tradeFiatValue = bnOrZero(
    fromBaseUnit(bnOrZero(trade?.sellAmount), trade?.sellAsset.precision ?? 0),
  )
    .times(bnOrZero(sellAssetFiatRate))
    .times(selectedCurrencyToUsdRate)

  //ratio of the fiat value of the gas fee to the fiat value of the trade value express in percentage
  const gasFeeToTradeRatioPercentage = feeFiatValue.dividedBy(tradeFiatValue).times(100).toNumber()
  const gasFeeToTradeRatioPercentageThreshold = 5
  const isFeeRatioOverThreshold =
    gasFeeToTradeRatioPercentage > gasFeeToTradeRatioPercentageThreshold

  const txLink = useMemo(() => {
    if (trade.sources[0].name === 'Osmosis') {
      return `${osmosisAsset?.explorerTxLink}${txid}`
    } else {
      return `${trade.sellAsset?.explorerTxLink}${txid}`
    }
  }, [trade, osmosisAsset, txid])

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
            <AssetToAsset
              buyIcon={trade.buyAsset.icon}
              tradeFiatAmount={tradeFiatAmount}
              trade={trade}
              mt={6}
              status={txid ? status : undefined}
            />
          </Card.Header>
          <Divider />
          <Card.Body pb={0} px={0}>
            <Stack spacing={4}>
              {txid && (
                <Row>
                  <Row.Label>
                    <RawText>Tx ID</RawText>
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
              <Row>
                <HelperTooltip label={translate('trade.tooltip.minerFee')}>
                  <Row.Label>
                    <Text translation='trade.minerFee' />
                  </Row.Label>
                </HelperTooltip>
                <Row.Value>
                  {bnOrZero(fees?.fee).toNumber()} ≃{' '}
                  {toFiat(
                    bnOrZero(fees?.fee).times(fiatRate).times(selectedCurrencyToUsdRate).toNumber(),
                  )}
                </Row.Value>
              </Row>
              <Row>
                <HelperTooltip label={translate('trade.tooltip.shapeshiftFee')}>
                  <Row.Label>
                    <Text
                      translation={['trade.tradeFeeSource', { tradeFeeSource: 'ShapeShift' }]}
                    />
                  </Row.Label>
                </HelperTooltip>
                <Row.Value>
                  {toFiat(
                    bnOrZero(fees?.tradeFee)
                      .times(buyAssetFiatRate)
                      .times(selectedCurrencyToUsdRate)
                      .toNumber(),
                  )}
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
          </Card.Body>
          <Card.Footer px={0} py={0}>
            {!txid && (
              <Button
                isLoading={isSubmitting}
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
