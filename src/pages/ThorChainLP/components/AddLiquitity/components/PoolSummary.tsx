import { Stack } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Row } from 'components/Row/Row'
import { RawText } from 'components/Text'

export const PoolSummary = () => {
  const translate = useTranslate()
  return (
    <Stack fontSize='sm' px={6} spacing={4} fontWeight='medium'>
      <RawText fontWeight='bold'>{translate('pools.initialPricesAndPoolShare')}</RawText>
      <Row>
        <Row.Label>{translate('pools.pricePerAsset', { from: 'USDC', to: 'ETH' })}</Row.Label>
        <Row.Value>
          <Amount value='5.39' />
        </Row.Value>
      </Row>
      <Row>
        <Row.Label>{translate('pools.shareOfPool')}</Row.Label>
        <Row.Value>
          <Amount.Percent value='0.2' />
        </Row.Value>
      </Row>
    </Stack>
  )
}
