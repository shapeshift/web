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
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Row, type RowProps } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import type { BigNumber } from 'lib/bignumber/bignumber'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from 'lib/swapper/swappers/ThorchainSwapper/constants'
import { isSome } from 'lib/utils'
import {
  selectActiveQuoteAffiliateBps,
  selectQuoteAffiliateFeeUserCurrency,
  selectQuoteFeeAmountUsd,
} from 'state/slices/tradeQuoteSlice/selectors'
import {
  convertDecimalPercentageToBasisPoints,
  subtractBasisPointAmount,
} from 'state/slices/tradeQuoteSlice/utils'
import { useAppSelector } from 'state/store'

import { FeeModal } from '../../FeeModal/FeeModal'
import { PriceImpact } from '../../PriceImpact'
import { MaxSlippage } from './MaxSlippage'
import { SwapperIcon } from './SwapperIcon/SwapperIcon'

type ReceiveSummaryProps = {
  isLoading?: boolean
  symbol: string
  amountCryptoPrecision: string
  intermediaryTransactionOutputs?: AmountDisplayMeta[]
  fiatAmount?: string
  amountBeforeFeesCryptoPrecision?: string
  protocolFees?: PartialRecord<AssetId, ProtocolFee>
  slippageDecimalPercentage: string
  swapperName: string
  defaultIsOpen?: boolean
  swapSource?: SwapSource
  priceImpact?: BigNumber
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
    slippageDecimalPercentage,
    swapperName,
    isLoading,
    defaultIsOpen = false,
    swapSource,
    priceImpact,
    ...rest
  }) => {
    const translate = useTranslate()
    const { isOpen, onToggle } = useDisclosure({ defaultIsOpen })
    const [showFeeModal, setShowFeeModal] = useState(false)
    const hoverColor = useColorModeValue('black', 'white')
    const redColor = useColorModeValue('red.500', 'red.300')
    const greenColor = useColorModeValue('green.600', 'green.200')
    const textColor = useColorModeValue('gray.800', 'whiteAlpha.900')

    // use the fee data from the actual quote in case it varies from the theoretical calculation
    const affiliateBps = useAppSelector(selectActiveQuoteAffiliateBps)
    const amountAfterDiscountUserCurrency = useAppSelector(selectQuoteAffiliateFeeUserCurrency)
    const quoteFeeUsd = useAppSelector(selectQuoteFeeAmountUsd)

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
      setShowFeeModal(!showFeeModal)
    }, [showFeeModal])

    const minAmountAfterSlippageTranslation: TextPropTypes['translation'] = useMemo(
      () => ['trade.minAmountAfterSlippage', { slippage: slippageAsPercentageString }],
      [slippageAsPercentageString],
    )

    const protocolFeeToolTip = useCallback(() => {
      return <Text color='text.subtle' translation={'trade.tooltip.protocolFee'} />
    }, [])

    return (
      <>
        <Stack spacing={4} py={4} fontSize='sm'>
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

          {priceImpact && <PriceImpact impactPercentage={priceImpact.toFixed(2)} />}
          <Divider borderColor='border.base' />

          {hasProtocolFees && (
            <Row Tooltipbody={protocolFeeToolTip} isLoading={isLoading}>
              <Row.Label>
                <Text translation='trade.protocolFee' />
              </Row.Label>
              <Row.Value color='text.base'>
                {protocolFeesParsed?.map(({ amountCryptoPrecision, symbol }) => (
                  <Amount.Crypto color={redColor} value={amountCryptoPrecision} symbol={symbol} />
                ))}
              </Row.Value>
            </Row>
          )}
          <Row isLoading={isLoading}>
            <Row.Label display='flex'>
              <Text translation={tradeFeeSourceTranslation} />
              {amountAfterDiscountUserCurrency !== '0' && (
                <RawText>&nbsp;{`(${affiliateBps} bps)`}</RawText>
              )}
            </Row.Label>
            <Row.Value onClick={handleFeeModal} _hover={shapeShiftFeeModalRowHover}>
              <Flex alignItems='center' gap={2}>
                {amountAfterDiscountUserCurrency !== '0' ? (
                  <>
                    <Amount.Fiat value={amountAfterDiscountUserCurrency} />
                    <QuestionIcon />
                  </>
                ) : (
                  <>
                    <Amount.Fiat
                      value={quoteFeeUsd}
                      color='text.subtle'
                      textDecoration='line-through'
                    />
                    <Text translation='trade.free' fontWeight='semibold' color={greenColor} />
                    <QuestionIcon color={greenColor} />
                  </>
                )}
              </Flex>
            </Row.Value>
          </Row>
        </Stack>
        <FeeModal isOpen={showFeeModal} onClose={handleFeeModal} />
      </>
    )
  },
)
