import { StarIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  Heading,
  HStack,
  Icon,
  Spinner,
  Stack,
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  Stepper,
  StepSeparator,
  StepStatus,
  StepTitle,
  Switch,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { getDefaultSlippagePercentageForSwapper } from 'constants/constants'
import { useCallback, useMemo } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { useAllowanceApproval } from 'components/MultiHopTrade/hooks/useAllowanceApproval/useAllowanceApproval'
import type { StepperStep } from 'components/MultiHopTrade/types'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import { useToggle } from 'hooks/useToggle/useToggle'
import type { Asset } from 'lib/asset-service'
import { fromBaseUnit } from 'lib/math'
import type { SwapperName, TradeQuote } from 'lib/swapper/api'
import { assertUnreachable, isSome } from 'lib/utils'
import { selectFeeAssetById, selectTradeExecutionStatus } from 'state/slices/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import { MultiHopExecutionStatus } from 'state/slices/swappersSlice/types'
import {
  selectHopTotalNetworkFeeFiatPrecision,
  selectHopTotalProtocolFeesFiatPrecision,
} from 'state/slices/tradeQuoteSlice/selectors'
import { store, useAppDispatch, useAppSelector } from 'state/store'

import { SwapperIcon } from '../TradeInput/components/SwapperIcon/SwapperIcon'

const useTradeExecutor = () => {
  const dispatch = useAppDispatch()
  const mockExecute = useCallback(() => {
    // next state
    dispatch(swappers.actions.incrementTradeExecutionState())

    // mock execution of tx
    setTimeout(() => dispatch(swappers.actions.incrementTradeExecutionState()), 3000)
  }, [dispatch])
  const reject = useCallback(() => {
    // TODO(woodenfurniture): rejecting a trade should do the following
    // - present a confirmation modal rendering the resulting amounts etc
    // - if user cancels rejecting, return to current flow
    // - if user confirms rejecting, update UI to show cancelled steps and display resulting amounts
    dispatch(swappers.actions.clear())
  }, [dispatch])
  const onSignApproval = mockExecute
  const onRejectApproval = reject
  const onSignTrade = mockExecute
  const onRejectTrade = reject

  return {
    onSignApproval,
    onRejectApproval,
    onSignTrade,
    onRejectTrade,
  }
}

const getApprovalStep = ({
  approvalNetworkFeeCryptoFormatted,
  txId,
  isExactAllowance,
  toggleIsExactAllowance,
  translate,
  onSign,
  onReject,
}: {
  approvalNetworkFeeCryptoFormatted: string
  txId?: string
  isExactAllowance: boolean
  toggleIsExactAllowance: () => void
  translate: ReturnType<typeof useTranslate>
  onSign: () => void
  onReject: () => void
}): StepperStep => {
  return {
    title: 'Token allowance approval',
    description: txId ?? `Approval gas fee ${approvalNetworkFeeCryptoFormatted}`,
    stepIndicator: <StepStatus complete={<StepIcon />} active={txId ? <Spinner /> : undefined} />,
    content: (
      <Card p='2'>
        {txId ? (
          <RawText>TX: {txId}</RawText>
        ) : (
          <HStack>
            <Row>
              <Row.Label display='flex' alignItems='center'>
                <Text color='text.subtle' translation='trade.allowance' />
                <Tooltip label={translate('trade.allowanceTooltip')}>
                  <Box ml={1}>
                    <Icon as={FaInfoCircle} color='text.subtle' fontSize='0.7em' />
                  </Box>
                </Tooltip>
              </Row.Label>
              <Row.Value textAlign='right' display='flex' alignItems='center'>
                <Text
                  color={isExactAllowance ? 'text.subtle' : 'white'}
                  translation='trade.unlimited'
                  fontWeight='bold'
                />
                <Switch
                  size='sm'
                  mx={2}
                  isChecked={isExactAllowance}
                  onChange={toggleIsExactAllowance}
                />
                <Text
                  color={isExactAllowance ? 'white' : 'text.subtle'}
                  translation='trade.exact'
                  fontWeight='bold'
                />
              </Row.Value>
            </Row>
            <Button onClick={onSign}>Approve</Button>
            <Button onClick={onReject}>Reject</Button>
          </HStack>
        )}
      </Card>
    ),
  }
}

const getTradeStep = ({
  txId,
  onSign,
  onReject,
}: {
  txId?: string
  onSign: () => void
  onReject: () => void
}): StepperStep => {
  return {
    title: 'Sign transaction',
    stepIndicator: <StepStatus complete={<StepIcon />} active={txId ? <Spinner /> : undefined} />,
    content: (
      <Card p='2'>
        {txId ? (
          <RawText>TX: {txId}</RawText>
        ) : (
          <HStack>
            <Button onClick={onSign}>Sign message</Button>
            <Button onClick={onReject}>Reject</Button>
          </HStack>
        )}
      </Card>
    ),
  }
}

enum TradeType {
  Bridge = 'Bridge',
  Swap = 'Swap',
}

const getTitleStep = ({
  hopIndex,
  isHopComplete,
  swapperName,
  tradeType,
}: {
  hopIndex: number
  isHopComplete: boolean
  swapperName: SwapperName
  tradeType: TradeType
}): StepperStep => {
  return {
    title: `${tradeType} via ${swapperName}`,
    stepIndicator: isHopComplete ? <StepIcon /> : <StepNumber>{hopIndex + 1}</StepNumber>,
  }
}

const getAssetSummaryStep = ({
  amountCryptoFormatted,
  asset,
}: {
  amountCryptoFormatted: string
  asset: Asset
}): StepperStep => {
  const chainAdapterManager = getChainAdapterManager()
  const chainName = chainAdapterManager.get(asset.chainId)?.getDisplayName()
  return {
    title: amountCryptoFormatted,
    description: `${amountCryptoFormatted} on ${chainName}`,
    stepIndicator: <AssetIcon src={asset.icon} boxSize='32px' />,
  }
}

const getHopSummaryStep = ({
  swapperName,
  buyAssetChainId,
  sellAssetChainId,
  buyAmountCryptoFormatted,
  sellAmountCryptoFormatted,
}: {
  swapperName: SwapperName
  buyAssetChainId: ChainId
  sellAssetChainId: ChainId
  buyAmountCryptoFormatted: string
  sellAmountCryptoFormatted: string
}): StepperStep => {
  const chainAdapterManager = getChainAdapterManager()
  const sellChainName = chainAdapterManager.get(sellAssetChainId)?.getDisplayName()
  const buyChainName = chainAdapterManager.get(buyAssetChainId)?.getDisplayName()
  const tradeType = buyAssetChainId === sellAssetChainId ? TradeType.Swap : TradeType.Bridge
  return {
    title:
      tradeType === TradeType.Swap
        ? `${tradeType} on ${sellChainName} via ${swapperName}`
        : `${tradeType} from ${sellChainName} to ${buyChainName} via ${swapperName}`,
    description: `${sellAmountCryptoFormatted}.ETH -> ${buyAmountCryptoFormatted}.AVA`, // TODO: chain "symbol"
    stepIndicator: <SwapperIcon swapperName={swapperName} />,
  }
}

const getDonationSummaryStep = ({
  donationAmountFiatFormatted,
}: {
  donationAmountFiatFormatted: string
}): StepperStep => {
  return {
    title: donationAmountFiatFormatted,
    description: 'ShapeShift Donation',
    stepIndicator: <StarIcon />,
  }
}

const FirstHop = ({
  swapperName,
  tradeQuote,
}: {
  swapperName: SwapperName
  tradeQuote: TradeQuote
}) => {
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter()
  const translate = useTranslate()

  const [isExactAllowance, toggleIsExactAllowance] = useToggle(false)

  const tradeQuoteStep = useMemo(() => tradeQuote.steps[0], [tradeQuote.steps])
  // TODO: use `isApprovalNeeded === undefined` here to display placeholder loading during initial approval check
  const {
    isApprovalNeeded,
    executeAllowanceApproval,
    approvalTxId,
    approvalNetworkFeeCryptoBaseUnit,
  } = useAllowanceApproval(tradeQuoteStep, isExactAllowance)

  const shouldRenderDonation = true // TODO:
  const { onRejectApproval, onSignTrade, onRejectTrade } = useTradeExecutor()

  const tradeExecutionStatus = useAppSelector(selectTradeExecutionStatus)

  const activeStep = useMemo(() => {
    switch (tradeExecutionStatus) {
      case MultiHopExecutionStatus.Unknown:
        return -Infinity
      case MultiHopExecutionStatus.Hop1AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingApprovalExecution:
        return 3
      case MultiHopExecutionStatus.Hop1AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingTradeExecution:
        return isApprovalNeeded ? 4 : 3
      case MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingApprovalExecution:
      case MultiHopExecutionStatus.Hop2AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingTradeExecution:
      case MultiHopExecutionStatus.TradeComplete:
        return Infinity
      default:
        assertUnreachable(tradeExecutionStatus)
    }
  }, [tradeExecutionStatus, isApprovalNeeded])

  const steps = useMemo(() => {
    const {
      buyAsset,
      sellAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit,
    } = tradeQuoteStep
    const sellAmountCryptoPrecision = fromBaseUnit(
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset.precision,
    )
    const buyAmountCryptoPrecision = fromBaseUnit(
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAsset.precision,
    )
    const sellAmountCryptoFormatted = toCrypto(sellAmountCryptoPrecision, sellAsset.symbol)
    const buyAmountCryptoFormatted = toCrypto(buyAmountCryptoPrecision, buyAsset.symbol)
    const hopSteps = [
      getTitleStep({
        hopIndex: 0,
        isHopComplete:
          tradeExecutionStatus === MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation,
        swapperName,
        tradeType: TradeType.Bridge,
      }),
      getAssetSummaryStep({
        amountCryptoFormatted: sellAmountCryptoFormatted,
        asset: sellAsset,
      }),
      getHopSummaryStep({
        swapperName,
        buyAssetChainId: buyAsset.chainId,
        sellAssetChainId: sellAsset.chainId,
        buyAmountCryptoFormatted,
        sellAmountCryptoFormatted,
      }),
    ].filter(isSome)

    if (isApprovalNeeded) {
      const feeAsset = selectFeeAssetById(store.getState(), sellAsset.assetId)
      const approvalNetworkFeeCryptoFormatted =
        feeAsset && approvalNetworkFeeCryptoBaseUnit
          ? toCrypto(
              fromBaseUnit(approvalNetworkFeeCryptoBaseUnit, feeAsset.precision),
              feeAsset.symbol,
            )
          : ''
      hopSteps.push(
        getApprovalStep({
          txId: approvalTxId,
          approvalNetworkFeeCryptoFormatted,
          isExactAllowance,
          translate,
          toggleIsExactAllowance,
          onSign: executeAllowanceApproval,
          onReject: onRejectApproval,
        }),
      )
    }

    const tradeTx =
      tradeExecutionStatus.valueOf() >= MultiHopExecutionStatus.Hop1AwaitingTradeExecution
        ? '0x5678'
        : undefined
    hopSteps.push(getTradeStep({ txId: tradeTx, onSign: onSignTrade, onReject: onRejectTrade }))

    if (tradeQuote.steps.length === 1) {
      if (shouldRenderDonation) {
        hopSteps.push(
          getDonationSummaryStep({
            donationAmountFiatFormatted: toFiat(1.2),
          }),
        )
      }

      hopSteps.push(
        getAssetSummaryStep({
          amountCryptoFormatted: toCrypto(buyAmountCryptoPrecision, buyAsset.symbol),
          asset: buyAsset,
        }),
      )
    }

    return hopSteps
  }, [
    approvalNetworkFeeCryptoBaseUnit,
    approvalTxId,
    executeAllowanceApproval,
    isApprovalNeeded,
    isExactAllowance,
    onRejectApproval,
    onRejectTrade,
    onSignTrade,
    shouldRenderDonation,
    swapperName,
    toCrypto,
    toFiat,
    toggleIsExactAllowance,
    tradeExecutionStatus,
    tradeQuote.steps.length,
    tradeQuoteStep,
    translate,
  ])

  const slippageDecimalPercentage = useMemo(
    () => tradeQuote.recommendedSlippage ?? getDefaultSlippagePercentageForSwapper(swapperName),
    [swapperName, tradeQuote.recommendedSlippage],
  )

  const networkFeeFiatPrecision = selectHopTotalNetworkFeeFiatPrecision(store.getState(), 0)
  const protocolFeeFiatPrecision = selectHopTotalProtocolFeesFiatPrecision(store.getState(), 0)

  return (
    <Hop
      steps={steps}
      activeStep={activeStep}
      slippageDecimalPercentage={slippageDecimalPercentage}
      networkFeeFiatPrecision={networkFeeFiatPrecision ?? '0'}
      protocolFeeFiatPrecision={protocolFeeFiatPrecision ?? '0'}
    />
  )
}

const SecondHop = ({
  swapperName,
  tradeQuote,
}: {
  swapperName: SwapperName
  tradeQuote: TradeQuote
}) => {
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter()
  const translate = useTranslate()

  const [isExactAllowance, toggleIsExactAllowance] = useToggle(false)

  const tradeQuoteStep = useMemo(() => tradeQuote.steps[1], [tradeQuote.steps])
  // TODO: use `isApprovalNeeded === undefined` here to display placeholder loading during initial approval check
  const {
    isApprovalNeeded,
    executeAllowanceApproval,
    approvalTxId,
    approvalNetworkFeeCryptoBaseUnit,
  } = useAllowanceApproval(tradeQuoteStep, isExactAllowance)
  const shouldRenderDonation = true // TODO:
  const { onRejectApproval, onSignTrade, onRejectTrade } = useTradeExecutor()
  const tradeExecutionStatus = useAppSelector(selectTradeExecutionStatus)

  const activeStep = useMemo(() => {
    switch (tradeExecutionStatus) {
      case MultiHopExecutionStatus.Unknown:
      case MultiHopExecutionStatus.Hop1AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingApprovalExecution:
      case MultiHopExecutionStatus.Hop1AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingTradeExecution:
        return -Infinity
      case MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingApprovalExecution:
        return 2
      case MultiHopExecutionStatus.Hop2AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingTradeExecution:
        return isApprovalNeeded ? 3 : 2
      case MultiHopExecutionStatus.TradeComplete:
        return Infinity
      default:
        assertUnreachable(tradeExecutionStatus)
    }
  }, [tradeExecutionStatus, isApprovalNeeded])

  const steps = useMemo(() => {
    const {
      buyAsset,
      sellAsset,
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      buyAmountBeforeFeesCryptoBaseUnit,
    } = tradeQuoteStep
    const sellAmountCryptoPrecision = fromBaseUnit(
      sellAmountIncludingProtocolFeesCryptoBaseUnit,
      sellAsset.precision,
    )
    const buyAmountCryptoPrecision = fromBaseUnit(
      buyAmountBeforeFeesCryptoBaseUnit,
      buyAsset.precision,
    )
    const sellAmountCryptoFormatted = toCrypto(sellAmountCryptoPrecision, sellAsset.symbol)
    const buyAmountCryptoFormatted = toCrypto(buyAmountCryptoPrecision, buyAsset.symbol)
    const hopSteps = [
      getTitleStep({
        hopIndex: 1,
        isHopComplete: tradeExecutionStatus === MultiHopExecutionStatus.TradeComplete,
        swapperName,
        tradeType: TradeType.Bridge,
      }),
      getHopSummaryStep({
        swapperName,
        buyAssetChainId: buyAsset.chainId,
        sellAssetChainId: sellAsset.chainId,
        buyAmountCryptoFormatted,
        sellAmountCryptoFormatted,
      }),
    ].filter(isSome)

    if (isApprovalNeeded) {
      const feeAsset = selectFeeAssetById(store.getState(), sellAsset.assetId)
      const approvalNetworkFeeCryptoFormatted =
        feeAsset && approvalNetworkFeeCryptoBaseUnit
          ? toCrypto(
              fromBaseUnit(approvalNetworkFeeCryptoBaseUnit, feeAsset.precision),
              feeAsset.symbol,
            )
          : ''
      hopSteps.push(
        getApprovalStep({
          txId: approvalTxId,
          approvalNetworkFeeCryptoFormatted,
          isExactAllowance,
          translate,
          toggleIsExactAllowance,
          onSign: executeAllowanceApproval,
          onReject: onRejectApproval,
        }),
      )
    }

    const tradeTx =
      tradeExecutionStatus.valueOf() >= MultiHopExecutionStatus.Hop1AwaitingTradeExecution
        ? '0x5678'
        : undefined
    hopSteps.push(getTradeStep({ txId: tradeTx, onSign: onSignTrade, onReject: onRejectTrade }))

    if (tradeQuote.steps.length === 2) {
      if (shouldRenderDonation) {
        hopSteps.push(
          getDonationSummaryStep({
            donationAmountFiatFormatted: toFiat(1.2),
          }),
        )
      }

      hopSteps.push(
        getAssetSummaryStep({
          amountCryptoFormatted: toCrypto(buyAmountCryptoPrecision, buyAsset.symbol),
          asset: buyAsset,
        }),
      )
    }

    return hopSteps
  }, [
    approvalNetworkFeeCryptoBaseUnit,
    approvalTxId,
    executeAllowanceApproval,
    isApprovalNeeded,
    isExactAllowance,
    onRejectApproval,
    onRejectTrade,
    onSignTrade,
    shouldRenderDonation,
    swapperName,
    toCrypto,
    toFiat,
    toggleIsExactAllowance,
    tradeExecutionStatus,
    tradeQuote.steps.length,
    tradeQuoteStep,
    translate,
  ])

  const slippageDecimalPercentage = useMemo(
    () => tradeQuote.recommendedSlippage ?? getDefaultSlippagePercentageForSwapper(swapperName),
    [swapperName, tradeQuote.recommendedSlippage],
  )

  const networkFeeFiatPrecision = selectHopTotalNetworkFeeFiatPrecision(store.getState(), 1)
  const protocolFeeFiatPrecision = selectHopTotalProtocolFeesFiatPrecision(store.getState(), 1)

  return (
    <Hop
      steps={steps}
      activeStep={activeStep}
      slippageDecimalPercentage={slippageDecimalPercentage}
      networkFeeFiatPrecision={networkFeeFiatPrecision ?? '0'}
      protocolFeeFiatPrecision={protocolFeeFiatPrecision ?? '0'}
    />
  )
}

const Hop = ({
  steps,
  activeStep,
  slippageDecimalPercentage,
  networkFeeFiatPrecision,
  protocolFeeFiatPrecision,
}: {
  steps: StepperStep[]
  activeStep: number
  slippageDecimalPercentage: string
  networkFeeFiatPrecision: string
  protocolFeeFiatPrecision: string
}) => {
  const backgroundColor = useColorModeValue('gray.100', 'gray.750')
  const borderColor = useColorModeValue('gray.50', 'gray.650')

  return (
    <Card
      flex={1}
      borderRadius={{ base: 'xl' }}
      width='full'
      backgroundColor={backgroundColor}
      borderColor={borderColor}
    >
      <Stepper
        index={activeStep}
        orientation='vertical'
        gap='0'
        height={steps.length * 60}
        margin={6}
      >
        {steps.map(({ title, stepIndicator, description, content }, index) => (
          <Step key={index}>
            <StepIndicator>{stepIndicator}</StepIndicator>

            <Box flexShrink='0'>
              <StepTitle>{title}</StepTitle>
              {description && <StepDescription>{description}</StepDescription>}
              {index === activeStep && content}
            </Box>
            <StepSeparator />
          </Step>
        ))}
      </Stepper>
      <CardFooter>
        <Divider />
        <HStack width='full'>
          <Amount.Percent value={slippageDecimalPercentage} display='inline' />
          {/* TODO: hovering over this should render a popover with details */}
          <Amount.Fiat value={networkFeeFiatPrecision} display='inline' />
          {/* TODO: hovering over this should render a popover with details */}
          <Amount.Fiat value={protocolFeeFiatPrecision} display='inline' />
        </HStack>
      </CardFooter>
    </Card>
  )
}

export const MultiHopTradeConfirm = ({
  swapperName,
  tradeQuote,
}: {
  swapperName: SwapperName
  tradeQuote: TradeQuote
}) => {
  const isMultiHopTrade = tradeQuote.steps.length > 1

  return (
    <SlideTransition>
      <Card flex={1} borderRadius={{ base: 'xl' }} width='full' padding={6}>
        <CardHeader px={0} pt={0}>
          <WithBackButton handleBack={() => {}}>
            <Heading textAlign='center'>
              <Text translation='trade.confirmDetails' />
            </Heading>
          </WithBackButton>
        </CardHeader>
        <CardBody pb={0} px={0}>
          <Stack spacing={6}>
            <FirstHop tradeQuote={tradeQuote} swapperName={swapperName} />
            {isMultiHopTrade && <SecondHop tradeQuote={tradeQuote} swapperName={swapperName} />}
          </Stack>
        </CardBody>
      </Card>
    </SlideTransition>
  )
}
