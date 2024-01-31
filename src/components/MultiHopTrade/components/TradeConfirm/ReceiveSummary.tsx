import { CheckIcon, CloseIcon, EditIcon, QuestionIcon } from '@chakra-ui/icons'
import {
  Box,
  Divider,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  Skeleton,
  Stack,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
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
import { useReceiveAddress } from 'components/MultiHopTrade/hooks/useReceiveAddress'
import { Row, type RowProps } from 'components/Row/Row'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import {
  THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE,
  THORCHAIN_STREAM_SWAP_SOURCE,
} from 'lib/swapper/swappers/ThorchainSwapper/constants'
import { isSome, middleEllipsis } from 'lib/utils'
import {
  selectActiveQuoteAffiliateBps,
  selectQuoteAffiliateFeeUserCurrency,
} from 'state/slices/tradeQuoteSlice/selectors'
import {
  convertDecimalPercentageToBasisPoints,
  subtractBasisPointAmount,
} from 'state/slices/tradeQuoteSlice/utils'
import { useAppSelector } from 'state/store'

import { FeeModal } from '../FeeModal/FeeModal'
import { SwapperIcon } from '../TradeInput/components/SwapperIcon/SwapperIcon'

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
} & RowProps

const editIcon = <EditIcon />
const checkIcon = <CheckIcon />
const closeIcon = <CloseIcon />

const shapeShiftFeeModalRowHover = { textDecoration: 'underline', cursor: 'pointer' }

const tradeFeeSourceTranslation: TextPropTypes['translation'] = [
  'trade.tradeFeeSource',
  { tradeFeeSource: 'ShapeShift' },
]

// TODO(gomes): implement me
const isCustomRecipientAddress = false
const recipientAddressTranslation: TextPropTypes['translation'] = isCustomRecipientAddress
  ? 'trade.customRecipientAddress'
  : 'trade.recipientAddress'

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
    ...rest
  }) => {
    const translate = useTranslate()
    const [showFeeModal, setShowFeeModal] = useState(false)
    const redColor = useColorModeValue('red.500', 'red.300')
    const greenColor = useColorModeValue('green.600', 'green.200')
    const textColor = useColorModeValue('gray.800', 'whiteAlpha.900')

    // use the fee data from the actual quote in case it varies from the theoretical calculation
    const affiliateBps = useAppSelector(selectActiveQuoteAffiliateBps)
    const amountAfterDiscountUserCurrency = useAppSelector(selectQuoteAffiliateFeeUserCurrency)

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

    // Recipient address state and handlers
    const [isRecipientAddressEditing, setIsRecipientAddressEditing] = useState(false)
    const handleEditRecipientAddressClick = useCallback(() => {
      setIsRecipientAddressEditing(true)
    }, [])

    const handleCancelClick = useCallback(() => {
      setIsRecipientAddressEditing(false)
    }, [])

    const handleSaveClick = useCallback(() => {
      setIsRecipientAddressEditing(false)
    }, [])

    const handleInputChange: React.ChangeEventHandler<HTMLInputElement> = useCallback(event => {
      // TODO(gomes): dispatch here and make the input controlled with a local state value and form context so that
      // typing actually does something
      // dispatch(tradeInput.actions.setManualReceiveAddress(undefined))
      console.log(event.target.value)
    }, [])

    const minAmountAfterSlippageTranslation: TextPropTypes['translation'] = useMemo(
      () => ['trade.minAmountAfterSlippage', { slippage: slippageAsPercentageString }],
      [slippageAsPercentageString],
    )

    const wallet = useWallet().state.wallet
    const useReceiveAddressArgs = useMemo(
      () => ({
        fetchUnchainedAddress: Boolean(wallet && isLedger(wallet)),
      }),
      [wallet],
    )
    const isHolisticRecipientAddressEnabled = useFeatureFlag('HolisticRecipientAddress')

    const receiveAddress = useReceiveAddress(useReceiveAddressArgs)

    // This should never happen but it may
    if (isHolisticRecipientAddressEnabled && !receiveAddress) return null

    return (
      <>
        <Stack fontSize='13px' spacing={3} pt={4} px={6}>
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

          {amountBeforeFeesCryptoPrecision && (
            <Row>
              <Row.Label>
                <Text translation='trade.buyAmount' />
              </Row.Label>
              <Row.Value color='text.base'>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Crypto
                    value={amountBeforeFeesCryptoPrecision}
                    symbol={symbol}
                    maximumFractionDigits={4}
                  />
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
              <Row.Value color='text.base'>
                {protocolFeesParsed?.map(({ amountCryptoPrecision, symbol, chainName }) => (
                  <Skeleton isLoaded={!isLoading} key={`${symbol}_${chainName}`}>
                    <Amount.Crypto color={redColor} value={amountCryptoPrecision} symbol={symbol} />
                  </Skeleton>
                ))}
              </Row.Value>
            </Row>
          )}
          <Row>
            <Row.Label display='flex'>
              <Text translation={tradeFeeSourceTranslation} />
              {amountAfterDiscountUserCurrency !== '0' && (
                <RawText>&nbsp;{`(${affiliateBps} bps)`}</RawText>
              )}
            </Row.Label>
            <Row.Value onClick={handleFeeModal} _hover={shapeShiftFeeModalRowHover}>
              <Skeleton isLoaded={!isLoading}>
                <Flex alignItems='center' gap={2}>
                  {amountAfterDiscountUserCurrency !== '0' ? (
                    <>
                      <Amount.Fiat value={amountAfterDiscountUserCurrency} />
                      <QuestionIcon />
                    </>
                  ) : (
                    <>
                      <Text translation='trade.free' fontWeight='semibold' color={greenColor} />
                      <QuestionIcon color={greenColor} />
                    </>
                  )}
                </Flex>
              </Skeleton>
            </Row.Value>
          </Row>
          <Divider borderColor='border.base' />
          <Row alignItems='flex-start' {...rest}>
            <Row.Label>
              <Stack direction='row' alignItems='center' spacing={1}>
                <Text translation='trade.youReceive' />
              </Stack>
            </Row.Label>
            <Row.Value display='flex' columnGap={2} alignItems='center' color='text.base'>
              <Stack spacing={0} alignItems='flex-end'>
                <Skeleton isLoaded={!isLoading}>
                  <Amount.Crypto
                    value={isAmountPositive ? amountCryptoPrecision : '0'}
                    maximumFractionDigits={4}
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
          {swapSource !== THORCHAIN_STREAM_SWAP_SOURCE &&
            swapSource !== THORCHAIN_LONGTAIL_STREAMING_SWAP_SOURCE && (
              <>
                <Row gap={4}>
                  <Row.Label>
                    <Text translation={minAmountAfterSlippageTranslation} />
                  </Row.Label>
                  <Row.Value whiteSpace='nowrap' color='text.base'>
                    <Stack spacing={0} alignItems='flex-end'>
                      <Skeleton isLoaded={!isLoading}>
                        <Amount.Crypto
                          value={amountAfterSlippage}
                          symbol={symbol}
                          maximumFractionDigits={4}
                        />
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
                                maximumFractionDigits={4}
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

          {/* TODO(gomes): This should probably be made its own component and <ManualAddressEntry /> removed */}
          {/* TODO(gomes): we can safely remove this condition when this feature goes live */}
          {isHolisticRecipientAddressEnabled &&
            receiveAddress &&
            (isRecipientAddressEditing ? (
              <InputGroup size='sm'>
                <Input
                  value={''} // TODO: Controlled input value
                  onChange={handleInputChange}
                  autoFocus
                  placeholder={translate('trade.customRecipientAddressDescription')}
                />
                <InputRightElement width='4.5rem'>
                  <Box
                    display='flex'
                    alignItems='center'
                    justifyContent='space-between'
                    width='full'
                    px='2'
                  >
                    <Box
                      as='button'
                      display='flex'
                      alignItems='center'
                      justifyContent='center'
                      borderRadius='md'
                      onClick={handleSaveClick}
                    >
                      {checkIcon}
                    </Box>
                    <Box
                      as='button'
                      display='flex'
                      alignItems='center'
                      justifyContent='center'
                      borderRadius='md'
                      onClick={handleCancelClick}
                    >
                      {closeIcon}
                    </Box>
                  </Box>
                </InputRightElement>
              </InputGroup>
            ) : (
              <>
                <Divider borderColor='border.base' />
                <Row>
                  <Row.Label>
                    <Text translation={recipientAddressTranslation} />
                  </Row.Label>
                  <Row.Value whiteSpace='nowrap'>
                    <Stack direction='row' spacing={1} alignItems='center'>
                      <RawText>{middleEllipsis(receiveAddress)}</RawText>
                      <Tooltip
                        label={translate('trade.customRecipientAddressDescription')}
                        placement='top'
                        hasArrow
                      >
                        <IconButton
                          aria-label='Edit recipient address'
                          icon={editIcon}
                          variant='ghost'
                          onClick={handleEditRecipientAddressClick}
                        />
                      </Tooltip>
                    </Stack>
                  </Row.Value>
                </Row>
              </>
            ))}
        </Stack>
        <FeeModal isOpen={showFeeModal} onClose={handleFeeModal} />
      </>
    )
  },
)
