import { ChevronDownIcon, ChevronUpIcon } from '@chakra-ui/icons'
import {
  Collapse,
  Divider,
  Skeleton,
  Stack,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import { type FC, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { type RowProps, Row } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import type { AmountDisplayMeta } from 'lib/swapper/api'
import { SwapperName } from 'lib/swapper/api'

type ReceiveSummaryProps = {
  isLoading?: boolean
  symbol: string
  amountCryptoPrecision: string
  intermediaryTransactionOutputs?: AmountDisplayMeta[]
  fiatAmount?: string
  amountBeforeFeesCryptoPrecision?: string
  protocolFees?: AmountDisplayMeta[]
  shapeShiftFee?: string
  slippage: string
  swapperName: string
} & RowProps

const parseAmountDisplayMeta = ({ amountCryptoBaseUnit, asset }: AmountDisplayMeta) => ({
  symbol: asset.symbol,
  chainName: getChainAdapterManager().get(asset.chainId)?.getDisplayName(),
  amountCryptoPrecision: fromBaseUnit(amountCryptoBaseUnit, asset.precision),
})

export const ReceiveSummary: FC<ReceiveSummaryProps> = ({
  symbol,
  amountCryptoPrecision,
  intermediaryTransactionOutputs,
  fiatAmount,
  amountBeforeFeesCryptoPrecision,
  protocolFees,
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
  const greenColor = useColorModeValue('green.600', 'green.200')
  const textColor = useColorModeValue('gray.800', 'whiteAlpha.900')

  const slippageAsPercentageString = bnOrZero(slippage).times(100).toString()
  const isAmountPositive = bnOrZero(amountCryptoPrecision).gt(0)

  const protocolFeesParsed = useMemo(
    () =>
      protocolFees
        ?.filter(({ amountCryptoBaseUnit }) => bnOrZero(amountCryptoBaseUnit).gt(0))
        .map(parseAmountDisplayMeta),
    [protocolFees],
  )

  const intermediaryTransactionOutputsParsed = useMemo(
    () =>
      intermediaryTransactionOutputs
        ?.filter(({ amountCryptoBaseUnit }) => bnOrZero(amountCryptoBaseUnit).gt(0))
        .map(parseAmountDisplayMeta),
    [intermediaryTransactionOutputs],
  )

  const hasProtocolFees = useMemo(
    () => protocolFeesParsed && protocolFeesParsed.length > 0,
    [protocolFeesParsed],
  )

  const hasIntermediaryTransactionOutputs = useMemo(
    () => intermediaryTransactionOutputsParsed && intermediaryTransactionOutputsParsed.length > 0,
    [intermediaryTransactionOutputsParsed],
  )

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
              <Amount.Crypto
                value={isAmountPositive ? amountCryptoPrecision : '0'}
                symbol={symbol}
              />
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
            <HelperTooltip
              label={
                swapperName === SwapperName.LIFI
                  ? translate('trade.tooltip.protocolLifi')
                  : translate('trade.tooltip.protocol')
              }
            >
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
          {amountBeforeFeesCryptoPrecision && (
            <Row>
              <Row.Label>
                <Text translation='trade.beforeFees' />
              </Row.Label>
              <Row.Value>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Crypto value={amountBeforeFeesCryptoPrecision} symbol={symbol} />
                </Skeleton>
              </Row.Value>
            </Row>
          )}
          {hasProtocolFees && (
            <Row>
              <HelperTooltip label={translate('trade.tooltip.protocolFee')}>
                <Row.Label>
                  <Text translation='trade.protocolFee' />
                </Row.Label>
              </HelperTooltip>
              <Row.Value>
                {protocolFeesParsed?.map(({ amountCryptoPrecision, symbol, chainName }) => (
                  <Skeleton isLoaded={!isLoading}>
                    <Amount.Crypto
                      color={redColor}
                      value={amountCryptoPrecision}
                      symbol={symbol}
                      suffix={
                        chainName
                          ? translate('trade.onChainName', {
                              chainName,
                            })
                          : undefined
                      }
                    />
                  </Skeleton>
                ))}
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
                <Stack spacing={0} alignItems='flex-end'>
                  <Skeleton isLoaded={!isLoading}>
                    <Amount.Crypto
                      value={isAmountPositive ? amountCryptoPrecision : '0'}
                      symbol={symbol}
                    />
                  </Skeleton>
                  {isAmountPositive &&
                    hasIntermediaryTransactionOutputs &&
                    intermediaryTransactionOutputsParsed?.map(
                      ({ amountCryptoPrecision, symbol, chainName }) => (
                        <Skeleton isLoaded={!isLoading}>
                          <Amount.Crypto
                            value={amountCryptoPrecision}
                            symbol={symbol}
                            prefix={translate('trade.or')}
                            suffix={
                              chainName
                                ? translate('trade.onChainName', {
                                    chainName,
                                  })
                                : undefined
                            }
                          />
                        </Skeleton>
                      ),
                    )}
                </Stack>
              </Row.Value>
            </Row>
          </>
        </Stack>
      </Collapse>
    </>
  )
}
