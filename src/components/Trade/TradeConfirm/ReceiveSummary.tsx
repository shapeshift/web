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
import { RawText, Text } from 'components/Text'
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
  swapperName: string
} & RowProps

export const ReceiveSummary: FC<ReceiveSummaryProps> = ({
  symbol,
  amount,
  fiatAmount,
  beforeFees,
  protocolFee,
  shapeShiftFee,
  slippage,
  swapperName,
  isLoading,
  ...rest
}) => {
  const translate = useTranslate()
  const { isOpen, onToggle } = useDisclosure()
  const summaryBg = useColorModeValue('gray.50', 'gray.800')
  const borderColor = useColorModeValue('gray.100', 'gray.750')
  const hoverColor = useColorModeValue('black', 'white')
  const redColor = useColorModeValue('red.500', 'red.300')
  const greenColor = useColorModeValue('green.500', 'green.200')
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900')

  const slippageAsPercentageString = bnOrZero(slippage).times(100).toString()
  const amountAfterSlippage = bnOrZero(amount)
    .times(1 - slippage)
    .toString()
  const isAmountPositive = bnOrZero(amountAfterSlippage).gt(0)

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
          <Row>
            <HelperTooltip label={translate('trade.tooltip.protocol')}>
              <Row.Label>
                <Text translation='trade.protocol' />
              </Row.Label>
            </HelperTooltip>
            <Row.Value>
              <Row.Label>
                <RawText fontWeight='semibold' color={textColor}>
                  {swapperName}
                </RawText>
              </Row.Label>
            </Row.Value>
          </Row>
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
          {protocolFee && bnOrZero(protocolFee).gt(0) && (
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
                  <Text translation={'trade.free'} fontWeight={'semibold'} color={greenColor} />
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
                  <Amount.Crypto
                    value={isAmountPositive ? amountAfterSlippage : '0'}
                    symbol={symbol}
                  />
                </Skeleton>
              </Row.Value>
            </Row>
          </>
        </Stack>
      </Collapse>
    </>
  )
}
