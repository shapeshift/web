import { StarIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  HStack,
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
  useColorModeValue,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import type { StepperStep } from 'components/MultiHopTrade/types'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { WithBackButton } from 'components/Trade/WithBackButton'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useLocaleFormatter } from 'hooks/useLocaleFormatter/useLocaleFormatter'
import type { Asset } from 'lib/asset-service'
import { localAssetData } from 'lib/asset-service'
import { SwapperName } from 'lib/swapper/api'
import { assertUnreachable } from 'lib/utils'
import { selectTradeExecutionStatus } from 'state/slices/selectors'
import { swappers } from 'state/slices/swappersSlice/swappersSlice'
import { MultiHopExecutionStatus } from 'state/slices/swappersSlice/types'
import { useAppDispatch, useAppSelector } from 'state/store'

import LiFiIcon from '../TradeQuotes/lifi-icon.png'

const useTradeExecutor = () => {
  const dispatch = useAppDispatch()
  const mockExecute = useCallback(() => {
    // next state
    dispatch(swappers.actions.incrementTradeExecutionState())

    // mock exection of tx
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
  onSign,
  onReject,
}: {
  approvalNetworkFeeCryptoFormatted: string
  txId?: string
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
  hopNumber,
  isHopComplete,
  swapperName,
  tradeType,
}: {
  hopNumber: number
  isHopComplete: boolean
  swapperName: SwapperName
  tradeType: TradeType
}): StepperStep => {
  return {
    title: `${tradeType} via ${swapperName}`,
    stepIndicator: isHopComplete ? <StepIcon /> : <StepNumber>{hopNumber}</StepNumber>,
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
    stepIndicator: <LazyLoadAvatar size='xs' src={LiFiIcon} />,
  }
}

const getDonationSummaryStep = (donationAmountFiatFormatted: string): StepperStep => {
  return {
    title: donationAmountFiatFormatted,
    description: 'ShapeShift Donation',
    stepIndicator: <StarIcon />,
  }
}

const FirstHop = () => {
  const {
    number: { toCrypto },
  } = useLocaleFormatter()

  const isApprovalRequired = true // TODO:
  const sellAsset =
    localAssetData[
      'cosmos:osmosis-1/ibc:00BC6883C29D45EAA021A55CFDD5884CA8EFF9D39F698A9FEF79E13819FF94F8'
    ]
  const buyAsset = localAssetData['eip155:1/erc20:0xe19f85c920b572ca48942315b06d6cac86585c87']
  const feeAsset = localAssetData['eip155:1/slip44:60']
  const sellAmountCryptoPrecision = 34.23
  const buyAmountCryptoPrecision = 1.234
  const approvalNetworkFeeCryptoPrecision = 1.234

  const { onSignApproval, onRejectApproval, onSignTrade, onRejectTrade } = useTradeExecutor()

  const tradeExecutionStatus = useAppSelector(selectTradeExecutionStatus)
  const isHopComplete =
    tradeExecutionStatus >= MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation

  const activeStep = useMemo(() => {
    switch (tradeExecutionStatus) {
      case MultiHopExecutionStatus.Unknown:
        return -Infinity
      case MultiHopExecutionStatus.Hop1AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingApprovalExecution:
        return 3
      case MultiHopExecutionStatus.Hop1AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingTradeExecution:
        return isApprovalRequired ? 4 : 3
      case MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingApprovalExecution:
      case MultiHopExecutionStatus.Hop2AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingTradeExecution:
      case MultiHopExecutionStatus.TradeComplete:
        return Infinity
      default:
        assertUnreachable(tradeExecutionStatus)
    }
  }, [tradeExecutionStatus, isApprovalRequired])

  const steps: StepperStep[] = useMemo(() => {
    const steps = [
      getTitleStep({
        hopNumber: 1,
        isHopComplete,
        swapperName: SwapperName.LIFI,
        tradeType: TradeType.Bridge,
      }),
      getAssetSummaryStep({
        amountCryptoFormatted: toCrypto(approvalNetworkFeeCryptoPrecision, sellAsset.symbol),
        asset: sellAsset,
      }),
      getHopSummaryStep({
        swapperName: SwapperName.LIFI,
        buyAssetChainId: buyAsset.chainId,
        sellAssetChainId: sellAsset.chainId,
        buyAmountCryptoFormatted: toCrypto(buyAmountCryptoPrecision, buyAsset.symbol),
        sellAmountCryptoFormatted: toCrypto(sellAmountCryptoPrecision, sellAsset.symbol),
      }),
    ]

    if (isApprovalRequired) {
      const approvalNetworkFeeCryptoFormatted = toCrypto(0.0012, feeAsset.symbol)
      const approvalTx =
        tradeExecutionStatus.valueOf() >= MultiHopExecutionStatus.Hop1AwaitingApprovalExecution
          ? '0x1234'
          : undefined
      steps.push(
        getApprovalStep({
          txId: approvalTx,
          approvalNetworkFeeCryptoFormatted,
          onSign: onSignApproval,
          onReject: onRejectApproval,
        }),
      )
    }

    const tradeTx =
      tradeExecutionStatus.valueOf() >= MultiHopExecutionStatus.Hop1AwaitingTradeExecution
        ? '0x5678'
        : undefined
    steps.push(getTradeStep({ txId: tradeTx, onSign: onSignTrade, onReject: onRejectTrade }))

    return steps
  }, [
    isHopComplete,
    toCrypto,
    sellAsset,
    buyAsset.chainId,
    buyAsset.symbol,
    isApprovalRequired,
    tradeExecutionStatus,
    onSignTrade,
    onRejectTrade,
    feeAsset.symbol,
    onSignApproval,
    onRejectApproval,
  ])

  return <Hop steps={steps} activeStep={activeStep} />
}

const SecondHop = () => {
  const {
    number: { toCrypto, toFiat },
  } = useLocaleFormatter()

  const isApprovalRequired = true // TODO:
  const shouldRenderDonation = true // TODO:
  const sellAsset = localAssetData['eip155:1/erc20:0xe1bda0c3bfa2be7f740f0119b6a34f057bd58eba']
  const buyAsset = localAssetData['eip155:1/erc20:0xe19f85c920b572ca48942315b06d6cac86585c87']
  const feeAsset = localAssetData['eip155:1/slip44:60']
  const sellAmountCryptoPrecision = 34.23
  const buyAmountCryptoPrecision = 1.234
  const approvalNetworkFeeCryptoPrecision = 1.234

  const { onSignApproval, onRejectApproval, onSignTrade, onRejectTrade } = useTradeExecutor()

  const tradeExecutionStatus = useAppSelector(selectTradeExecutionStatus)
  const isHopComplete = tradeExecutionStatus >= MultiHopExecutionStatus.TradeComplete
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
        return isApprovalRequired ? 3 : 2
      case MultiHopExecutionStatus.TradeComplete:
        return Infinity
      default:
        assertUnreachable(tradeExecutionStatus)
    }
  }, [tradeExecutionStatus, isApprovalRequired])

  const steps: StepperStep[] = useMemo(() => {
    const steps = [
      getTitleStep({
        hopNumber: 2,
        isHopComplete,
        swapperName: SwapperName.LIFI,
        tradeType: TradeType.Swap,
      }),
      getHopSummaryStep({
        swapperName: SwapperName.LIFI,
        buyAssetChainId: buyAsset.chainId,
        sellAssetChainId: sellAsset.chainId,
        buyAmountCryptoFormatted: toCrypto(buyAmountCryptoPrecision, buyAsset.symbol),
        sellAmountCryptoFormatted: toCrypto(sellAmountCryptoPrecision, sellAsset.symbol),
      }),
    ]

    if (isApprovalRequired) {
      const approvalNetworkFeeCryptoFormatted = toCrypto(
        approvalNetworkFeeCryptoPrecision,
        feeAsset.symbol,
      )
      const approvalTx =
        tradeExecutionStatus.valueOf() >= MultiHopExecutionStatus.Hop2AwaitingApprovalExecution
          ? '0x1234'
          : undefined
      steps.push(
        getApprovalStep({
          txId: approvalTx,
          approvalNetworkFeeCryptoFormatted,
          onSign: onSignApproval,
          onReject: onRejectApproval,
        }),
      )
    }

    const tradeTx =
      tradeExecutionStatus.valueOf() >= MultiHopExecutionStatus.Hop2AwaitingTradeExecution
        ? '0x5678'
        : undefined
    steps.push(getTradeStep({ txId: tradeTx, onSign: onSignTrade, onReject: onRejectTrade }))

    if (shouldRenderDonation) {
      steps.push(getDonationSummaryStep(toFiat(1.2)))
    }

    steps.push(
      getAssetSummaryStep({
        amountCryptoFormatted: toCrypto(buyAmountCryptoPrecision, buyAsset.symbol),
        asset: buyAsset,
      }),
    )

    return steps
  }, [
    isHopComplete,
    buyAsset,
    sellAsset.chainId,
    sellAsset.symbol,
    toCrypto,
    isApprovalRequired,
    tradeExecutionStatus,
    onSignTrade,
    onRejectTrade,
    shouldRenderDonation,
    feeAsset.symbol,
    onSignApproval,
    onRejectApproval,
    toFiat,
  ])

  return <Hop steps={steps} activeStep={activeStep} />
}

const Hop = ({ steps, activeStep }: { steps: StepperStep[]; activeStep: number }) => {
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
      <Card.Footer>
        <Divider />
        <HStack width='full'>
          <RawText display='inline'>0.1%</RawText> {/* slippage */}
          <RawText display='inline'>$0.01</RawText> {/* gas */}
          <RawText display='inline'>$0.00</RawText> {/* protocol fee? */}
        </HStack>
      </Card.Footer>
    </Card>
  )
}

export const TradeConfirm = () => {
  // TODO: use quote to determine this
  const isMultiHopTrade = true
  return (
    <SlideTransition>
      <Card flex={1} borderRadius={{ base: 'xl' }} width='full' padding={6}>
        <Card.Header px={0} pt={0}>
          <WithBackButton handleBack={() => {}}>
            <Card.Heading textAlign='center'>
              <Text translation='trade.confirmDetails' />
            </Card.Heading>
          </WithBackButton>
        </Card.Header>
        <Card.Body pb={0} px={0}>
          <Stack spacing={6}>
            <FirstHop />
            {isMultiHopTrade && <SecondHop />}
          </Stack>
        </Card.Body>
      </Card>
    </SlideTransition>
  )
}
