import { ArrowBackIcon } from '@chakra-ui/icons'
import { Box, Button, Divider, IconButton, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { Card } from 'components/Card/Card'
import { HelperToolTip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { useFormContext } from 'react-hook-form'
import { RouterProps } from 'react-router-dom'

import { AssetToAsset } from './AssetToAsset'

export const TradeConfirm = ({ history }: RouterProps) => {
  const { getValues } = useFormContext()
  const { sellAsset, buyAsset } = getValues()
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
          <AssetToAsset
            buyAsset={{
              symbol: buyAsset?.symbol,
              amount: buyAsset.amount,
              icon: buyAsset?.icon
            }}
            sellAsset={{
              symbol: sellAsset?.symbol,
              amount: sellAsset.amount,
              icon: sellAsset?.icon
            }}
            mt={6}
          />
        </Card.Header>
        <Divider />
        <Card.Body pb={0} px={0}>
          <Stack spacing={4}>
            <Row>
              <HelperToolTip label='This is the rate'>
                <Row.Label>Rate</Row.Label>
              </HelperToolTip>
              <Box textAlign='right'>
                <Text>1 ETH = 3,557.29 USDC</Text>
                <Text color='gray.500'>@0x</Text>
              </Box>
            </Row>
            <Row>
              <HelperToolTip label='This is the Miner Fee'>
                <Row.Label>Miner Fee</Row.Label>
              </HelperToolTip>
              <Row.Value>$67.77</Row.Value>
            </Row>
            <Row>
              <HelperToolTip label='This is the Miner Fee'>
                <Row.Label>ShapeShift Fee</Row.Label>
              </HelperToolTip>
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
            onClick={() => history.push('/trade/input')}
          >
            Confirm and Trade
          </Button>
        </Card.Footer>
      </Card>
    </SlideTransition>
  )
}
