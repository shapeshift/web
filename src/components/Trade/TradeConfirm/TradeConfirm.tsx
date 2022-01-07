import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  IconButton,
  Link,
  SimpleGrid,
  Stack,
  useToast
} from '@chakra-ui/react'
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

import { AssetToAsset } from './AssetToAsset'

type TradeConfirmParams = {
  fiatRate: string
}

type SwapError = Error & { message: string }

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
      // TODO: (ryankk) this needs to be revisited post bounty to handle actual errors coming back from unchained.
      let errorMessage
      switch ((err as SwapError)?.message) {
        case 'ZrxExecuteQuote - signAndBroadcastTransaction error: Error: Error signing & broadcasting tx': {
          errorMessage = TRADE_ERRORS.TRANSACTION_REJECTED
          break
        }
        default: {
          errorMessage = TRADE_ERRORS.INSUFFICIENT_FUNDS
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
            <SimpleGrid gridTemplateColumns='25px 1fr 25px' alignItems='center' mx={-2}>
              <IconButton
                icon={<ArrowBackIcon />}
                aria-label='Back'
                variant='ghost'
                fontSize='xl'
                isRound
                onClick={handleBack}
              />
              <Card.Heading textAlign='center'>
                <Text translation={txid ? 'trade.complete' : 'trade.confirmTrade'} />
              </Card.Heading>
            </SimpleGrid>
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
