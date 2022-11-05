import { Stack } from '@chakra-ui/react'
import { bnOrZero } from '@keepkey/investor-foxy'
import { type FC } from 'react'
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
  isLoading?: boolean
  isError?: boolean
}
export const RateGasRow: FC<RateGasRowProps> = ({
  sellSymbol,
  buySymbol,
  rate,
  gasFee,
  isLoading,
}) => {
  const translate = useTranslate()
  switch (true) {
    case isLoading:
      return (
        <Stack direction='row' alignItems='center' fontSize='sm'>
          <CircularProgress size='16px' />
          <Text translation={'trade.searchingRate'} />
        </Stack>
      )
    case !rate:
      return (
        <Stack direction='row' alignItems='center' fontSize='sm'>
          <HelperTooltip
            label={translate('trade.tooltip.noRateAvailable')}
            flexProps={{ flexDirection: 'row-reverse' }}
          >
            <Text translation={'trade.noRateAvailable'} />
          </HelperTooltip>
        </Stack>
      )
    default:
      return (
        <Stack direction='row' fontWeight='medium'>
          <Row fontSize='sm' flex={1}>
            <Row.Value fontSize='sm'>
              <HelperTooltip
                label={translate('trade.tooltip.rate')}
                flexProps={{ flexDirection: 'row-reverse' }}
              >
                <Stack width='full' direction='row' spacing={1}>
                  <Amount.Crypto
                    fontSize='sm'
                    value='1'
                    symbol={sellSymbol ?? ''}
                    suffix={sellSymbol ? '=' : ''}
                  />
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
            <Row.Label fontSize='sm'>
              <FaGasPump />
            </Row.Label>
            <Row.Value>
              <Amount.Fiat fontSize='sm' value={gasFee} />
            </Row.Value>
          </Row>
        </Stack>
      )
  }
}
