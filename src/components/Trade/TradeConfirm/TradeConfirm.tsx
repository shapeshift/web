import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Button, Divider, IconButton, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useFormContext } from 'react-hook-form'
import { RouterProps } from 'react-router-dom'
import { Card } from 'components/Card/Card'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import {  useSwapper } from 'components/Trade/hooks/useSwapper/useSwapper'
import { bn } from 'lib/bignumber/bignumber'
import { firstNonZeroDecimal } from 'lib/math'

import { AssetToAsset } from './AssetToAsset'

export const TradeConfirm = ({ history }: RouterProps) => {
  const { getValues } = useFormContext()
  const { sellAsset, buyAsset, quote, fees, trade } = getValues()
  const { executeQuote } = useSwapper()
  const {
    number: { toFiat }
  } = useLocaleFormatter({ fiatType: 'USD' })
  const {
    state: { wallet }
  } = useWallet()

  const onSubmit = async () => {
    await executeQuote({ wallet })
    // TODO:(ryankk) navigate to somewhere else.
    history.push('/trade/input')
  }

  return (
    <SlideTransition>
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
            <Card.Heading textAlign='center'>Confirm Trade</Card.Heading>
          </SimpleGrid>
          <AssetToAsset buyAsset={buyAsset} sellAsset={sellAsset} mt={6} />
        </Card.Header>
        <Divider />
        <Card.Body pb={0} px={0}>
          <Stack spacing={4}>
            <Row>
              <HelperTooltip label='This is the rate'>
                <Row.Label>Rate</Row.Label>
              </HelperTooltip>
              <Box textAlign='right'>
                <Text>{`1 ${sellAsset.currency.symbol} = ${firstNonZeroDecimal(bn(quote.rate))} ${
                  buyAsset.currency.symbol
                }`}</Text>
                <Text color='gray.500'>@{trade?.name}</Text>
              </Box>
            </Row>
            <Row>
              <HelperTooltip label='This is the Miner Fee'>
                <Row.Label>Miner Fee</Row.Label>
              </HelperTooltip>
              <Row.Value>{toFiat(bn(fees?.fee).times(quote?.rate).toNumber())}</Row.Value>
            </Row>
            <Row>
              <HelperTooltip label='This is the Miner Fee'>
                <Row.Label>ShapeShift Fee</Row.Label>
              </HelperTooltip>
              <Row.Value>$0.00</Row.Value>
            </Row>
          </Stack>
        </Card.Body>
        <Card.Footer px={0} py={0}>
          <Button
            colorScheme='blue'
            size='lg'
            width='full'
            mt={6}
            onClick={() => onSubmit()}
          >
            Confirm and Trade
          </Button>
        </Card.Footer>
      </Card>
    </SlideTransition>
  )
}
