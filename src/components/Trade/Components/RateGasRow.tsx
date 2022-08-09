import { Stack } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import { FaGasPump } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { firstNonZeroDecimal } from 'lib/math'

type RateGasRowProps = {
  sellSymbol?: string
  buySymbol?: string
  rate?: string
  gasFee: string
}
export const RateGasRow: React.FC<RateGasRowProps> = ({ sellSymbol, buySymbol, rate, gasFee }) => {
  const translate = useTranslate()
  return !rate ? (
    <Stack direction='row' alignItems='center' fontSize='sm' px={2}>
      <CircularProgress size='16px' />
      <Text translation={'trade.searchingRate'} />
    </Stack>
  ) : (
    <Stack px={2} direction='row'>
      <Row fontSize='sm' flex={1}>
        <Row.Value fontWeight='medium' fontSize='sm'>
          <HelperTooltip label={translate('trade.tooltip.rate')}>
            <Stack width='full' direction='row' spacing={1}>
              <Amount.Crypto fontSize='sm' value='1' symbol={sellSymbol ?? ''} suffix='=' />
              <Amount.Crypto
                fontSize='sm'
                value={firstNonZeroDecimal(bnOrZero(rate)) ?? ''}
                symbol={buySymbol ?? ''}
              />
            </Stack>
          </HelperTooltip>
        </Row.Value>
      </Row>
      <Row justifyContent='flex-end' alignItems='center' width='auto' columnGap={2}>
        <Row.Label>
          <FaGasPump />
        </Row.Label>
        <Row.Value>
          <Amount.Fiat fontSize='sm' value={gasFee} />
        </Row.Value>
      </Row>
    </Stack>
  )
}
