import { Box, Button, Divider, Link, Stack, useToast } from '@chakra-ui/react'
import { SupportedChainIds } from '@shapeshiftoss/types'
import { useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { RouterProps, useLocation } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { TRADE_ERRORS, useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { WalletActions } from 'context/WalletProvider/actions'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal, fromBaseUnit } from 'lib/math'
import { selectFirstAccountSpecifierByChainId, selectTxStatusById } from 'state/slices/selectors'
import { makeUniqueTxId } from 'state/slices/txHistorySlice/utils'
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
  } = useFormContext<TradeState<SupportedChainIds>>()
  const toast = useToast()
  const translate = useTranslate()
  const { trade, fees, sellAssetFiatRate } = getValues()
  const { executeQuote, reset } = useSwapper()
  const location = useLocation<TradeConfirmParams>()
  const { fiatRate } = location.state
  const {
    number: { toFiat },
  } = useLocaleFormatter({ fiatType: 'USD' })
  const {
    state: { wallet, isConnected },
    dispatch,
  } = useWallet()
  const { chainId } = trade.sellAsset
  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, chainId),
  )

  const parsedTxId = useMemo(
    () => makeUniqueTxId(accountSpecifier, txid, trade.receiveAddress),
    [accountSpecifier, trade.receiveAddress, txid],
  )
  const status = useAppSelector(state => selectTxStatusById(state, parsedTxId))

  const onSubmit = async () => {
    if (!wallet) return
    if (!isConnected) {
      /**
       * call handleBack to reset current form state
       * before opening the connect wallet modal.
       */
      handleBack()
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      return
    }
    try {
      const result = await executeQuote({ wallet })
      const transactionId = result?.txid
      if (transactionId) {
        setTxid(transactionId)
      }
    } catch (err) {
      console.error(`TradeConfirm:onSubmit - ${err}`)
      toast({
        title: translate('trade.errors.title'),
        description: translate(TRADE_ERRORS.DEX_TRADE_FAILED),
        status: 'error',
        duration: 9000,
        isClosable: true,
        position: 'top-right',
      })
    }
  }

  const handleBack = () => {
    if (txid) {
      reset()
    }
    history.push(TradeRoutePaths.Input)
  }

  const tradeFiatAmount = toFiat(
    bnOrZero(fromBaseUnit(bnOrZero(trade?.sellAmount), trade?.sellAsset.precision ?? 0))
      .times(bnOrZero(sellAssetFiatRate))
      .toNumber(),
  )

  return (
    <SlideTransition>
      <Box as='form' onSubmit={handleSubmit(onSubmit)}>
        <Card variant='unstyled'>
          <Card.Header px={0} pt={0}>
            <WithBackButton handleBack={handleBack}>
              <Card.Heading textAlign='center'>
                <Text translation={txid ? 'trade.complete' : 'trade.confirmDetails'} />
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
                    <Link
                      isExternal
                      color='blue.500'
                      href={`${trade.sellAsset?.explorerTxLink}${txid}`}
                    >
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
                  {toFiat(bnOrZero(fees?.fee).times(fiatRate).toNumber())}
                </Row.Value>
              </Row>
              <Row>
                <HelperTooltip label={translate('trade.tooltip.shapeshiftFee')}>
                  <Row.Label>
                    <Text translation='trade.shapeshiftFee' />
                  </Row.Label>
                </HelperTooltip>
                <Row.Value>{toFiat(0)}</Row.Value>
              </Row>
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
