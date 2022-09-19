import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Collapse,
  Divider,
  Skeleton,
  Stack,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import { type FC } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { type RowProps, Row } from 'components/Row/Row'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'

type ReceiveSummaryProps = {
  isLoading?: boolean
  symbol: string
  amount: string
  fiatAmount?: string
  beforeFees?: string
  protocolFee?: string
  shapeShiftFee?: string
  slippage: number
} & RowProps

export const ReceiveSummary: FC<ReceiveSummaryProps> = ({
  symbol,
  amount,
  fiatAmount,
  beforeFees,
  protocolFee,
  shapeShiftFee,
  slippage,
  isLoading,
  ...rest
}) => {
  const translate = useTranslate()
  const { isOpen, onToggle } = useDisclosure()
  const summaryBg = useColorModeValue('gray.50', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const hoverColor = useColorModeValue('black', 'white')
  const redColor = useColorModeValue('red.500', 'red.300')

  const slippageAsPercentageString = bnOrZero(slippage).times(100).toString()
  const isAmountPositive = bnOrZero(amount).gt(0)

  return (
    <>
      <Row fontSize='sm' fontWeight='medium' alignItems='flex-start' {...rest}>
        <Row.Label onClick={onToggle} cursor='pointer' _hover={{ color: hoverColor }}>
          <Stack direction='row' alignItems='center' spacing={1}>
            <Text translation='trade.expectedAmount' />
            {isOpen ? <ChevronUpIcon boxSize='16px' /> : <ChevronDownIcon boxSize='16px' />}
          </Stack>
        </Row.Label>
        <Row.Value display='flex' columnGap={2} alignItems='center'>
          <Stack spacing={0} alignItems='flex-end'>
            <Skeleton isLoaded={!isLoading}>
              <Amount.Crypto value={isAmountPositive ? amount : '0'} symbol={symbol} />
            </Skeleton>
            {fiatAmount && (
              <Skeleton isLoaded={!isLoading}>
                <Amount.Fiat color='gray.500' value={fiatAmount} prefix='≈' />
              </Skeleton>
            )}
          </Stack>
        </Row.Value>
      </Row>
      <Collapse in={isOpen}>
        <Stack
          fontSize='sm'
          bg={summaryBg}
          fontWeight='medium'
          borderWidth={1}
          borderColor={borderColor}
          borderRadius='xl'
          px={4}
          py={2}
        >
          {beforeFees && (
            <Row>
              <Row.Label>
                <Text translation='trade.beforeFees' />
              </Row.Label>
              <Row.Value>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Crypto value={beforeFees} symbol={symbol} />
                </Skeleton>
              </Row.Value>
            </Row>
          )}
          {protocolFee && (
            <Row>
              <HelperTooltip label={translate('trade.tooltip.protocolFee')}>
                <Row.Label>
                  <Text translation='trade.protocolFee' />
                </Row.Label>
              </HelperTooltip>
              <Row.Value>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Crypto color={redColor} value={protocolFee} symbol={symbol} />
                </Skeleton>
              </Row.Value>
            </Row>
          )}
          {shapeShiftFee && (
            <Row>
              <HelperTooltip label={translate('trade.tooltip.shapeshiftFee')}>
                <Row.Label>
                  <Text translation={['trade.tradeFeeSource', { tradeFeeSource: 'ShapeShift' }]} />
                </Row.Label>
              </HelperTooltip>
              <Row.Value>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Crypto value={shapeShiftFee} symbol={symbol} />
                </Skeleton>
              </Row.Value>
            </Row>
          )}
          <>
            <Divider />
            <Row>
              <Row.Label>
                <Text
                  translation={[
                    'trade.minAmountAfterSlippage',
                    { slippage: slippageAsPercentageString },
                  ]}
                />
              </Row.Label>
              <Row.Value whiteSpace='nowrap'>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Crypto value={isAmountPositive ? amount : '0'} symbol={symbol} />
                </Skeleton>
              </Row.Value>
            </Row>
          </>
        </Stack>
      </Collapse>
    </>
  )
}
