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
import { useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import type { StepperStep } from 'components/MultiHopTrade/types'
import { MultiHopExecutionStatus } from 'components/MultiHopTrade/types'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { WithBackButton } from 'components/Trade/WithBackButton'
import { localAssetData } from 'lib/asset-service'

import LiFiIcon from '../TradeQuotes/lifi-icon.png'

const getIsHopComplete = (tradeExecutionStatus: MultiHopExecutionStatus, isFirstHop: boolean) => {
  switch (true) {
    case isFirstHop:
      return tradeExecutionStatus >= MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation
    case !isFirstHop:
      return tradeExecutionStatus >= MultiHopExecutionStatus.TradeComplete
    default:
      return false
  }
}

const getActiveStepperStep = (
  tradeExecutionStatus: MultiHopExecutionStatus,
  isFirstHop: boolean,
  isApprovalRequired: boolean,
) => {
  if (isFirstHop) {
    switch (tradeExecutionStatus) {
      case MultiHopExecutionStatus.Hop1AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingApprovalExecution:
        return 2
      case MultiHopExecutionStatus.Hop1AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop1AwaitingTradeExecution:
        return isApprovalRequired ? 3 : 2
      default:
        return 0
    }
  } else {
    switch (tradeExecutionStatus) {
      case MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingApprovalExecution:
        return 1
      case MultiHopExecutionStatus.Hop2AwaitingTradeConfirmation:
      case MultiHopExecutionStatus.Hop2AwaitingTradeExecution:
        return isApprovalRequired ? 2 : 1
      default:
        return 0
    }
  }
}

const Hop = ({
  isApprovalRequired,
  shouldRenderDonation,
  isFirstHop,
}: {
  isApprovalRequired: boolean
  shouldRenderDonation: boolean
  isFirstHop: boolean
}) => {
  const backgroundColor = useColorModeValue('gray.100', 'gray.750')
  const borderColor = useColorModeValue('gray.50', 'gray.650')

  // TODO: move me to store and use that
  const initialStatus = isFirstHop
    ? MultiHopExecutionStatus.Hop1AwaitingApprovalConfirmation
    : MultiHopExecutionStatus.Hop2AwaitingApprovalConfirmation

  // const tradeExecutionStatus = initialStatus
  // Fixme: debugging only
  const tradeExecutionStatus = MultiHopExecutionStatus.Hop1AwaitingTradeConfirmation

  const isComplete = getIsHopComplete(tradeExecutionStatus, isFirstHop)
  const activeStep = getActiveStepperStep(tradeExecutionStatus, isFirstHop, isApprovalRequired)

  const steps: StepperStep[] = useMemo(() => {
    const steps = []

    steps.push({
      title: 'Bridge via LIFI',
      stepIndicator: isComplete ? <StepIcon /> : <StepNumber>{isFirstHop ? 1 : 2}</StepNumber>,
    })

    if (isFirstHop) {
      steps.push({
        title: '100 USDC',
        description: '$100 USDC on Ethereum',
        stepIndicator: (
          <AssetIcon
            src={localAssetData['eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'].icon}
            boxSize='32px'
          />
        ),
      })
    }

    steps.push({
      title: 'Bridge from Ethereum to Optimism via LIFI',
      description: '100 USCD.ETH -> 96.234 USCD.OP',
      stepIndicator: <LazyLoadAvatar size='xs' src={LiFiIcon} />,
    })

    if (isApprovalRequired) {
      steps.push({
        title: 'Token allowance approval',
        description: 'Approval gas fee 900ETH',
        stepIndicator: <StepStatus complete={<StepIcon />} active={<Spinner />} />,
        content: (
          <Card p='2'>
            {tradeExecutionStatus === MultiHopExecutionStatus.Hop1AwaitingApprovalConfirmation ? (
              <HStack>
                <Button>Approve</Button>
                <Button>Reject</Button>
              </HStack>
            ) : (
              <RawText>TXID: 1234</RawText>
            )}
          </Card>
        ),
      })
    }

    steps.push({
      title: 'Sign bridge transaction',
      stepIndicator: <StepStatus complete={<StepIcon />} active={<Spinner />} />,
      content: (
        <Card p='2'>
          <HStack>
            <Button>Sign message</Button>
            <Button>Reject</Button>
          </HStack>
        </Card>
      ),
    })

    if (shouldRenderDonation) {
      steps.push({
        title: '$2.50',
        description: 'ShapeShift Donation',
        stepIndicator: <StarIcon />,
      })
    }

    if (!isFirstHop) {
      steps.push({
        title: '95.3216 DAI',
        description: '$96.23 DAI on Optimism',
        stepIndicator: (
          <AssetIcon
            src={localAssetData['eip155:10/erc20:0xda10009cbd5d07dd0cecc66161fc93d7c9000da1'].icon}
            boxSize='32px'
          />
        ),
      })
    }

    return steps
  }, [isComplete, isFirstHop, isApprovalRequired, shouldRenderDonation, tradeExecutionStatus])

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

const FirstHop = () => {
  // TODO: mock values
  return <Hop isFirstHop={true} isApprovalRequired={true} shouldRenderDonation={false} />
}

const SecondHop = () => {
  // TODO: mock values
  return <Hop isFirstHop={false} isApprovalRequired={false} shouldRenderDonation={true} />
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
