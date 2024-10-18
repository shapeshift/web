import { QuestionIcon } from '@chakra-ui/icons'
import { Divider, Flex, Stack, useColorModeValue } from '@chakra-ui/react'
import { type AssetId } from '@shapeshiftoss/caip'
import type {
  AmountDisplayMeta,
  ProtocolFee,
  SwapperName,
  SwapSource,
} from '@shapeshiftoss/swapper'
import type { PartialRecord } from '@shapeshiftoss/types'
import { type FC, memo, useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { FeeModal } from 'components/FeeModal/FeeModal'
import { Row, type RowProps } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { isSome } from 'lib/utils'

import { PriceImpact } from '../../PriceImpact'
import { MaxSlippage } from './MaxSlippage'
import { SwapperIcon } from './SwapperIcon/SwapperIcon'

type ReceiveSummaryProps = {
  isLoading?: boolean
  symbol: string
  amountCryptoPrecision: string
  intermediaryTransactionOutputs: AmountDisplayMeta[] | undefined
  protocolFees: PartialRecord<AssetId, ProtocolFee> | undefined
  slippageDecimalPercentage: string
  swapperName: string
  defaultIsOpen?: boolean
  swapSource: SwapSource | undefined
  priceImpact: BigNumber.Value | undefined
  inputAmountUsd: string | undefined
  affiliateBps: string | undefined
  affiliateFeeAfterDiscountUserCurrency: string | undefined
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
    protocolFees,
    slippageDecimalPercentage,
    swapperName,
    isLoading,
    swapSource,
    priceImpact,
    inputAmountUsd,
    affiliateBps,
    affiliateFeeAfterDiscountUserCurrency,
  }) => {
    const translate = useTranslate()
    const [showFeeModal, setShowFeeModal] = useState(false)
    const redColor = useColorModeValue('red.500', 'red.300')
    const greenColor = useColorModeValue('green.600', 'green.200')
    const textColor = useColorModeValue('gray.800', 'whiteAlpha.900')

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

    const toggleFeeModal = useCallback(() => {
      setShowFeeModal(!showFeeModal)
    }, [showFeeModal])

    const protocolFeeToolTip = useCallback(() => {
      return <Text color='text.subtle' translation={'trade.tooltip.protocolFee'} />
    }, [])

    return (
      <>
        <Stack spacing={4} py={4} px={6} fontSize='sm'>
          <Row alignItems='center'>
            <Row.Label display='flex' gap={2} alignItems='center'>
              {translate('trade.protocol')}
            </Row.Label>
            <Row.Value display='flex' gap={2} alignItems='center'>
              <SwapperIcon size='2xs' swapperName={swapperName as SwapperName} />
              <RawText fontWeight='semibold' color={textColor}>
                {swapperName}
              </RawText>
            </Row.Value>
          </Row>

          <MaxSlippage
            swapSource={swapSource}
            isLoading={isLoading}
            symbol={symbol}
            amountCryptoPrecision={amountCryptoPrecision}
            slippageDecimalPercentage={slippageDecimalPercentage}
            hasIntermediaryTransactionOutputs={hasIntermediaryTransactionOutputs}
            intermediaryTransactionOutputs={intermediaryTransactionOutputs}
          />

          {priceImpact && <PriceImpact priceImpactPercentage={bnOrZero(priceImpact).toFixed(2)} />}
          <Divider borderColor='border.base' />

          {hasProtocolFees && (
            <Row Tooltipbody={protocolFeeToolTip} isLoading={isLoading}>
              <Row.Label>
                <Text translation='trade.protocolFee' />
              </Row.Label>
              <Row.Value color='text.base'>
                {protocolFeesParsed?.map(({ amountCryptoPrecision, symbol }) => (
                  <Amount.Crypto
                    key={`${amountCryptoPrecision}`}
                    color={redColor}
                    value={amountCryptoPrecision}
                    symbol={symbol}
                  />
                ))}
              </Row.Value>
            </Row>
          )}
          <Row isLoading={isLoading}>
            <Row.Label display='flex'>
              <Text translation={tradeFeeSourceTranslation} />
              {affiliateFeeAfterDiscountUserCurrency !== '0' && (
                <RawText>&nbsp;{`(${affiliateBps} bps)`}</RawText>
              )}
            </Row.Label>
            <Row.Value onClick={toggleFeeModal} _hover={shapeShiftFeeModalRowHover}>
              <Flex alignItems='center' gap={2}>
                {!!affiliateFeeAfterDiscountUserCurrency &&
                affiliateFeeAfterDiscountUserCurrency !== '0' ? (
                  <>
                    <Amount.Fiat value={affiliateFeeAfterDiscountUserCurrency} />
                    <QuestionIcon />
                  </>
                ) : (
                  <>
                    <Text translation='trade.free' fontWeight='semibold' color={greenColor} />
                    <QuestionIcon color={greenColor} />
                  </>
                )}
              </Flex>
            </Row.Value>
          </Row>
        </Stack>
        <FeeModal
          isOpen={showFeeModal}
          onClose={toggleFeeModal}
          inputAmountUsd={inputAmountUsd}
          feeModel='SWAPPER'
        />
      </>
    )
  },
)
