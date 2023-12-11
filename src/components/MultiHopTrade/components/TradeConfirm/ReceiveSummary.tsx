import { ChevronDownIcon, ChevronUpIcon, QuestionIcon } from '@chakra-ui/icons'
import {
  Collapse,
  Divider,
  Flex,
  Skeleton,
  Stack,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { AmountDisplayMeta, ProtocolFee, SwapSource } from '@shapeshiftoss/swapper'
import { SwapperName } from '@shapeshiftoss/swapper'
import type { PartialRecord } from '@shapeshiftoss/types'
import { type FC, memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row, type RowProps } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type { ShapeShiftFee } from 'lib/fees/utils'
import { fromBaseUnit } from 'lib/math'
import { THORCHAIN_STREAM_SWAP_SOURCE } from 'lib/swapper/swappers/ThorchainSwapper/constants'
import { isSome } from 'lib/utils'
import {
  convertDecimalPercentageToBasisPoints,
  subtractBasisPointAmount,
} from 'state/slices/tradeQuoteSlice/utils'

import { FeeModal } from '../FeeModal/FeeModal'

type ReceiveSummaryProps = {
  isLoading?: boolean
  symbol: string
  amountCryptoPrecision: string
  intermediaryTransactionOutputs?: AmountDisplayMeta[]
  fiatAmount?: string
  amountBeforeFeesCryptoPrecision?: string
  protocolFees?: PartialRecord<AssetId, ProtocolFee>
  shapeShiftFee?: ShapeShiftFee
  slippageDecimalPercentage: string
  swapperName: string
  donationAmountUserCurrency?: string
  defaultIsOpen?: boolean
  swapSource?: SwapSource
} & RowProps

const shapeShiftFeeModalRowHover = { textDecoration: 'underline', cursor: 'pointer' }

const tradeFeeSourceTranslation: TextPropTypes['translation'] = [
  'trade.tradeFeeSource',
  { tradeFeeSource: 'ShapeShift' },
]

export const ReceiveSummary: FC<ReceiveSummaryProps> = memo(
  ({
    symbol,
    amountCryptoPrecision,
    intermediaryTransactionOutputs,
    fiatAmount,
    amountBeforeFeesCryptoPrecision,
    protocolFees,
    shapeShiftFee,
    slippageDecimalPercentage,
    swapperName,
    isLoading,
    donationAmountUserCurrency,
    defaultIsOpen = false,
    swapSource,
    ...rest
  }) => {
    const translate = useTranslate()
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen })
    const [showFeeModal, setShowFeeModal] = useState(false)
    const hoverColor = useColorModeValue('black', 'white')
    const redColor = useColorModeValue('red.500', 'red.300')
    const greenColor = useColorModeValue('green.600', 'green.200')
    const textColor = useColorModeValue('gray.800', 'whiteAlpha.900')
    const isFoxDiscountsEnabled = useFeatureFlag('FoxDiscounts')

    const slippageAsPercentageString = bnOrZero(slippageDecimalPercentage).times(100).toString()
    const isAmountPositive = bnOrZero(amountCryptoPrecision).gt(0)

    const parseAmountDisplayMeta = useCallback((items: AmountDisplayMeta[]) => {
      return items
        .filter(({ amountCryptoBaseUnit }) => bnOrZero(amountCryptoBaseUnit).gt(0))
        .map(({ amountCryptoBaseUnit, asset }: AmountDisplayMeta) => ({
          symbol: asset.symbol,
          chainName: getChainAdapterManager().get(asset.chainId)?.getDisplayName(),
          amountCryptoPrecision: fromBaseUnit(amountCryptoBaseUnit, asset.precision),
        }))
    }, [])

    const protocolFeesParsed = useMemo(
      () =>
        protocolFees
          ? parseAmountDisplayMeta(Object.values(protocolFees).filter(isSome))
          : undefined,
      [protocolFees, parseAmountDisplayMeta],
    )

    const intermediaryTransactionOutputsParsed = useMemo(
      () =>
        intermediaryTransactionOutputs
          ? parseAmountDisplayMeta(intermediaryTransactionOutputs)
          : undefined,
      [intermediaryTransactionOutputs, parseAmountDisplayMeta],
    )

    const hasProtocolFees = useMemo(
      () => protocolFeesParsed && protocolFeesParsed.length > 0,
      [protocolFeesParsed],
    )

    const hasIntermediaryTransactionOutputs = useMemo(
      () => intermediaryTransactionOutputsParsed && intermediaryTransactionOutputsParsed.length > 0,
      [intermediaryTransactionOutputsParsed],
    )

    const amountAfterSlippage = useMemo(() => {
      const slippageBps = convertDecimalPercentageToBasisPoints(slippageDecimalPercentage)
      return isAmountPositive ? subtractBasisPointAmount(amountCryptoPrecision, slippageBps) : '0'
    }, [amountCryptoPrecision, isAmountPositive, slippageDecimalPercentage])

    const handleFeeModal = useCallback(() => {
      if (!isFoxDiscountsEnabled) return
      setShowFeeModal(!showFeeModal)
    }, [isFoxDiscountsEnabled, showFeeModal])

    const minAmountAfterSlippageTranslation: TextPropTypes['translation'] = useMemo(
      () => ['trade.minAmountAfterSlippage', { slippage: slippageAsPercentageString }],
      [slippageAsPercentageString],
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
                  <Amount.Fiat color='text.subtle' value={fiatAmount} prefix='≈' />
                </Skeleton>
              )}
            </Stack>
          </Row.Value>
        </Row>
        <Collapse in={isOpen}>
          <Stack fontSize='sm' borderTopWidth={1} borderColor='border.base' pt={2}>
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
                    <Skeleton isLoaded={!isLoading} key={`${symbol}_${chainName}`}>
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
            <Row>
              <Row.Label display='flex'>
                <Text translation={tradeFeeSourceTranslation} />
                {shapeShiftFee && shapeShiftFee.amountAfterDiscountUserCurrency !== '0' && (
                  <RawText>&nbsp;{`(${shapeShiftFee.affiliateBps} bps)`}</RawText>
                )}
              </Row.Label>
              <Row.Value
                onClick={handleFeeModal}
                _hover={isFoxDiscountsEnabled ? shapeShiftFeeModalRowHover : undefined}
              >
                <Skeleton isLoaded={!isLoading}>
                  <Flex alignItems='center' gap={2}>
                    {shapeShiftFee && shapeShiftFee.amountAfterDiscountUserCurrency !== '0' ? (
                      <>
                        <Amount.Fiat value={shapeShiftFee.amountAfterDiscountUserCurrency} />
                        {isFoxDiscountsEnabled && <QuestionIcon />}
                      </>
                    ) : (
                      <>
                        <Text translation='trade.free' fontWeight='semibold' color={greenColor} />
                        {isFoxDiscountsEnabled && <QuestionIcon color={greenColor} />}
                      </>
                    )}
                  </Flex>
                </Skeleton>
              </Row.Value>
            </Row>
            {!isFoxDiscountsEnabled &&
              donationAmountUserCurrency &&
              donationAmountUserCurrency !== '0' && (
                <Row>
                  <HelperTooltip label={translate('trade.tooltip.donation')}>
                    <Row.Label>
                      <Text translation='trade.donation' />
                    </Row.Label>
                  </HelperTooltip>
                  <Row.Value>
                    <Skeleton isLoaded={!isLoading}>
                      <Amount.Fiat value={donationAmountUserCurrency} />
                    </Skeleton>
                  </Row.Value>
                </Row>
              )}
            {swapSource !== THORCHAIN_STREAM_SWAP_SOURCE && (
              <>
                <Divider borderColor='border.base' />
                <Row>
                  <Row.Label>
                    <Text translation={minAmountAfterSlippageTranslation} />
                  </Row.Label>
                  <Row.Value whiteSpace='nowrap'>
                    <Stack spacing={0} alignItems='flex-end'>
                      <Skeleton isLoaded={!isLoading}>
                        <Amount.Crypto value={amountAfterSlippage} symbol={symbol} />
                      </Skeleton>
                      {isAmountPositive &&
                        hasIntermediaryTransactionOutputs &&
                        intermediaryTransactionOutputsParsed?.map(
                          ({ amountCryptoPrecision, symbol, chainName }) => (
                            <Skeleton isLoaded={!isLoading} key={`${symbol}_${chainName}`}>
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
            )}
          </Stack>
        </Collapse>
        <FeeModal isOpen={showFeeModal} onClose={handleFeeModal} shapeShiftFee={shapeShiftFee} />
      </>
    )
  },
)
