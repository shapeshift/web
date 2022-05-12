import { Box, Button, Divider, Link, Stack, useToast } from '@chakra-ui/react'
import { AssetNamespace, AssetReference, toCAIP19 } from '@shapeshiftoss/caip'
import { ChainTypes, NetworkTypes } from '@shapeshiftoss/types'
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
import { WalletActions } from 'context/WalletProvider/actions'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal, fromBaseUnit } from 'lib/math'
import { selectLastTxStatusByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { ValueOf } from 'types/object'

import { TradeRoutePaths, TradeState } from '../types'
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
    formState: { isSubmitting },
  } = useFormContext<TradeState<ChainTypes>>()
  const toast = useToast()
  const translate = useTranslate()
  const { trade, fees, sellAssetFiatRate } = getValues()
  const { executeQuote, reset } = useSwapper()
  const location = useLocation<TradeConfirmParams>()
  const { fiatRate } = location.state
  const {
    number: { toFiat },
  } = useLocaleFormatter()
  const {
    state: { wallet, isConnected },
    dispatch,
  } = useWallet()
  const { chain, tokenId } = trade.sellAsset
  const network = NetworkTypes.MAINNET
  const assetNamespace = AssetNamespace.ERC20
  const extra = tokenId
    ? { assetNamespace, assetReference: tokenId }
    : { assetNamespace: AssetNamespace.Slip44, assetReference: AssetReference.Ethereum }
  const caip = toCAIP19({ chain, network, ...extra })

  const status = useAppSelector(state => selectLastTxStatusByAssetId(state, caip))

  // Parametrized errors cannot simply be matched with === since their param(s) might vary
  const PARAMETRIZED_ERRORS_TO_TRADE_ERRORS = {
    'ZrxExecuteQuote - signAndBroadcastTransaction error': TRADE_ERRORS.TRANSACTION_REJECTED,
    'ZrxExecuteQuote - Signed transaction is required': TRADE_ERRORS.SIGNING_REQUIRED,
    'ZrxExecuteQuote - broadcastTransaction error': TRADE_ERRORS.BROADCAST_FAILED,
    'ZrxExecuteQuote - invalid HDWallet config': TRADE_ERRORS.HDWALLET_INVALID_CONFIG,
    'ZrxExecuteQuote - signTransaction error': TRADE_ERRORS.SIGNING_FAILED,
  } as const

  const getParametrizedErrorMessageOrDefault = (
    errorMessage: string,
  ): ValueOf<typeof PARAMETRIZED_ERRORS_TO_TRADE_ERRORS> | TRADE_ERRORS.INSUFFICIENT_FUNDS => {
    // If no other error pattern is found, we assume the tx was rejected because of insufficient funds
    const defaultTradeError = TRADE_ERRORS.INSUFFICIENT_FUNDS
    return (
      Object.entries(PARAMETRIZED_ERRORS_TO_TRADE_ERRORS).find(([error]) =>
        errorMessage.includes(error),
      )?.[1] || defaultTradeError
    )
  }

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
              status={status}
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
