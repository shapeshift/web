import { Box, Button, Divider, Link, Stack, useToast } from '@chakra-ui/react'
import { caip19 } from '@shapeshiftoss/caip'
import { ChainTypes, ContractTypes, NetworkTypes, SwapperType } from '@shapeshiftoss/types'
import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { RouterProps, useLocation } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { TRADE_ERRORS, useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { TradeState } from 'components/Trade/Trade'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'
import { selectLastTxStatusByAssetId } from 'state/slices/txHistorySlice/txHistorySlice'
import { useAppSelector } from 'state/store'
import { ValueOf } from 'types/object'

import { WithBackButton } from '../WithBackButton'
import { AssetToAsset } from './AssetToAsset'

type TradeConfirmParams = {
  fiatRate: string
}

type ZrxError = Error & { message: string }

export const TradeConfirm = ({ history }: RouterProps) => {
  const [txid, setTxid] = useState('')
  const {
    getValues,
    handleSubmit,
    formState: { isSubmitting }
  } = useFormContext<TradeState<ChainTypes, SwapperType>>()
  const toast = useToast()
  const translate = useTranslate()
  const { sellAsset, buyAsset, quote, fees, trade } = getValues()
  const { executeQuote, reset } = useSwapper()
  const location = useLocation<TradeConfirmParams>()
  const { fiatRate } = location.state
  const {
    number: { toFiat }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const {
    state: { wallet }
  } = useWallet()
  const { chain, tokenId } = sellAsset.currency
  const network = NetworkTypes.MAINNET
  const contractType = ContractTypes.ERC20
  const extra = { contractType, tokenId }
  const caip = caip19.toCAIP19({ chain, network, ...(tokenId ? extra : undefined) })

  const status = useAppSelector(state => selectLastTxStatusByAssetId(state, caip))

  // Parametrized errors cannot simply be matched with === since their param(s) might vary
  const PARAMETRIZED_ERRORS_TO_TRADE_ERRORS = {
    'ZrxExecuteQuote - signAndBroadcastTransaction error': TRADE_ERRORS.TRANSACTION_REJECTED,
    'ZrxExecuteQuote - Signed transaction is required': TRADE_ERRORS.SIGNING_REQUIRED,
    'ZrxExecuteQuote - broadcastTransaction error': TRADE_ERRORS.BROADCAST_FAILED,
    'ZrxExecuteQuote - invalid HDWallet config': TRADE_ERRORS.HDWALLET_INVALID_CONFIG,
    'ZrxExecuteQuote - signTransaction error': TRADE_ERRORS.SIGNING_FAILED
  } as const

  const getParametrizedErrorMessageOrDefault = (
    errorMessage: string
  ): ValueOf<typeof PARAMETRIZED_ERRORS_TO_TRADE_ERRORS> | TRADE_ERRORS.INSUFFICIENT_FUNDS => {
    // If no other error pattern is found, we assume the tx was rejected because of insufficient funds
    const defaultTradeError = TRADE_ERRORS.INSUFFICIENT_FUNDS
    return (
      Object.entries(PARAMETRIZED_ERRORS_TO_TRADE_ERRORS).find(([error]) =>
        errorMessage.includes(error)
      )?.[1] || defaultTradeError
    )
  }

  const onSubmit = async () => {
    if (!wallet) return
    try {
      const result = await executeQuote({ wallet })
      const transactionId = result?.txid
      if (transactionId) {
        setTxid(transactionId)
      }
    } catch (err) {
      console.error(`TradeConfirm:onSubmit - ${err}`)
      let errorMessage
      switch ((err as ZrxError).message) {
        case 'ZrxSwapper:ZrxExecuteQuote Cannot execute a failed quote': {
          errorMessage = TRADE_ERRORS.FAILED_QUOTE_EXECUTED
          break
        }
        case 'ZrxSwapper:ZrxExecuteQuote sellAssetAccountId is required': {
          errorMessage = TRADE_ERRORS.SELL_ASSET_REQUIRED
          break
        }
        case 'ZrxSwapper:ZrxExecuteQuote sellAmount is required': {
          errorMessage = TRADE_ERRORS.SELL_AMOUNT_REQUIRED
          break
        }
        case 'ZrxSwapper:ZrxExecuteQuote depositAddress is required': {
          errorMessage = TRADE_ERRORS.DEPOSIT_ADDRESS_REQUIRED
          break
        }
        case 'ZrxSwapper:ZrxExecuteQuote sellAssetNetwork and sellAssetSymbol are required': {
          errorMessage = TRADE_ERRORS.SELL_ASSET_NETWORK_AND_SYMBOL_REQUIRED
          break
        }
        default: {
          errorMessage = getParametrizedErrorMessageOrDefault((err as ZrxError).message)
        }
      }
      toast({
        title: translate('trade.errors.title'),
        description: translate(errorMessage),
        status: 'error',
        duration: 9000,
        isClosable: true,
        position: 'top-right'
      })
    }
  }

  const handleBack = () => {
    if (txid) {
      reset()
    }
    history.push('/trade/input')
  }

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
            <AssetToAsset buyAsset={buyAsset} sellAsset={sellAsset} mt={6} status={status} />
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
                      href={`${sellAsset.currency?.explorerTxLink}${txid}`}
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
                  <RawText>{`1 ${sellAsset.currency.symbol} = ${firstNonZeroDecimal(
                    bnOrZero(quote?.rate)
                  )} ${buyAsset?.currency?.symbol}`}</RawText>
                  <RawText color='gray.500'>@{trade?.name}</RawText>
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
