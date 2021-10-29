import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Button, Divider, IconButton, Link, SimpleGrid, Stack } from '@chakra-ui/react'
import { chainAdapters } from '@shapeshiftoss/types'
import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { RouterProps, useLocation } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { bn } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'
import { ReduxState } from 'state/reducer'

import { selectTxHistoryByTxid } from '../helpers'
import { AssetToAsset } from './AssetToAsset'

type TradeConfirmParams = {
  ethFiatRate: string
}

export const TradeConfirm = ({ history }: RouterProps) => {
  const [txid, setTxid] = useState('')
  const {
    getValues,
    handleSubmit,
    formState: { isSubmitting }
  } = useFormContext()
  const { sellAsset, buyAsset, quote, fees, trade } = getValues()
  const { executeQuote } = useSwapper()
  const location = useLocation()
  const { ethFiatRate } = location.state as TradeConfirmParams
  const {
    number: { toFiat }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const {
    state: { wallet }
  } = useWallet()
  const { chain, tokenId } = sellAsset.currency
  const asset = tokenId ?? chain
  const txs = useSelector((state: ReduxState) => {
    return selectTxHistoryByTxid(state, chain, asset, txid)
  })
  const transaction = txs[0]

  const status: chainAdapters.TxStatus | undefined =
    transaction && (transaction.status as chainAdapters.TxStatus)

  const onSubmit = async () => {
    if (wallet) {
      const result = await executeQuote({ wallet })
      const transactionId = result?.txid
      if (transactionId) {
        setTxid(transactionId)
      }
    }
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
                onClick={() => history.push('/trade/input')}
              />
              <Card.Heading textAlign='center'>
                <Text translation='trade.confirmTrade' />
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
                      href={sellAsset.currency?.explorerTxLink + txid}
                    >
                      <Text translation='trade.viewTransaction' />
                    </Link>
                  </Box>
                </Row>
              )}
              <Row>
                <HelperTooltip label='This is the rate'>
                  <Row.Label>
                    <Text translation='trade.rate' />
                  </Row.Label>
                </HelperTooltip>
                <Box textAlign='right'>
                  <RawText>{`1 ${sellAsset.currency.symbol} = ${firstNonZeroDecimal(
                    bn(quote.rate)
                  )} ${buyAsset.currency.symbol}`}</RawText>
                  <RawText color='gray.500'>@{trade?.name}</RawText>
                </Box>
              </Row>
              <Row>
                <HelperTooltip label='This is the Miner Fee'>
                  <Row.Label>
                    <Text translation='trade.minerFee' />
                  </Row.Label>
                </HelperTooltip>
                <Row.Value>{toFiat(bn(fees?.fee).times(ethFiatRate).toNumber())}</Row.Value>
              </Row>
              <Row>
                <HelperTooltip label='This is the Shapeshift Fee'>
                  <Row.Label>
                    <Text translation='trade.shapeshiftFee' />
                  </Row.Label>
                </HelperTooltip>
                <Row.Value>$0.00</Row.Value>
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
