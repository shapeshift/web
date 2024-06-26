import {
  Button,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Heading,
  Stack,
} from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { PropsWithChildren } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { FaX } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectTxById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { RfoxBridgeQuote } from '../Stake/Bridge/types'
import { TransactionRow } from './TransactionRow'

export type MultiStepStatusStep = {
  asset: Asset
  headerCopy: string
  serializedTxIndex: string | undefined
} & (
  | { isActionable: true; onSignAndBroadcast: () => Promise<string | undefined> }
  | { isActionable: false; onSignAndBroadcast?: never }
)

type SharedMultiStepStatusProps = {
  onBack: () => void
  onContinue: () => void
  confirmedQuote: RfoxBridgeQuote
  steps: MultiStepStatusStep[]
} & PropsWithChildren

export const SharedMultiStepStatus: React.FC<SharedMultiStepStatusProps> = ({
  confirmedQuote,
  onBack: handleBack,
  onContinue: handleContinue,
  steps,
}) => {
  const translate = useTranslate()
  const numSteps = 2
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [canGoBack, setCanGoBack] = useState(true)
  const [txStatus, setTxStatus] = useState<TxStatus>()

  const sellAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.sellAssetId))
  const buyAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.buyAssetId))

  const bridgeAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision ?? 0),
    [confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const handleTxStatusUpdate = useCallback(
    (status: TxStatus) => {
      setTxStatus(status)

      if (status === TxStatus.Confirmed) return setActiveStepIndex(activeStepIndex + 1)
    },
    [activeStepIndex],
  )

  const tx = useAppSelector(state =>
    selectTxById(state, steps[activeStepIndex]?.serializedTxIndex ?? ''),
  )

  useEffect(() => {
    handleTxStatusUpdate(tx?.status)
  }, [tx?.status, handleTxStatusUpdate])

  const handleStart = useCallback(() => {
    setCanGoBack(false)
  }, [setCanGoBack])

  // This allows us to either do a single step or multiple steps
  // Once a step is complete the next step is shown
  // If the active step is the same as the length of steps we can assume it is complete.
  const isComplete = activeStepIndex === steps.length
  const isFailed = txStatus === TxStatus.Failed
  const isSubmitted =
    // If this is an actionable step, we're in pending state once the Tx is pending
    (steps[activeStepIndex]?.isActionable && txStatus === TxStatus.Pending) ||
    // Else if this isn't an actionable step, we're in pending state as soon as the step kicks in, and stay into it so long as the Tx is pending
    (!steps[activeStepIndex]?.isActionable && (!txStatus || txStatus === TxStatus.Pending))

  const progress = useMemo(() => activeStepIndex / numSteps, [activeStepIndex])
  const progressPercentage = useMemo(
    () => `${activeStepIndex + 1}/${numSteps}`,
    [activeStepIndex, numSteps],
  )

  const renderBody = useMemo(() => {
    if (!steps.length) return null

    if (isComplete) {
      return (
        <CardBody display='flex' flexDir='column' alignItems='center' justifyContent='center'>
          <Center
            bg='background.success'
            boxSize='80px'
            borderRadius='full'
            color='text.success'
            fontSize='xl'
            my={8}
          >
            <FaCheck />
          </Center>
          <Heading as='h4'>{translate('common.happySuccess')}</Heading>
          <Text translation='RFOX.bridgeSuccess' />
        </CardBody>
      )
    }

    if (isFailed) {
      return (
        <CardBody display='flex' flexDir='column' alignItems='center' justifyContent='center'>
          <Center
            bg='background.error'
            boxSize='80px'
            borderRadius='full'
            color='text.error'
            fontSize='xl'
            my={8}
          >
            <FaX />
          </Center>
          <Heading as='h4'>{translate('common.transactionFailed')}</Heading>
        </CardBody>
      )
    }

    return (
      <CardBody textAlign='center'>
        <Center mb={8}>
          <CircularProgress
            size='100px'
            thickness={4}
            value={progress}
            trackColor='background.surface.raised.base'
            isIndeterminate={isSubmitted}
          >
            <CircularProgressLabel fontSize='md'>{progressPercentage}</CircularProgressLabel>
          </CircularProgress>
        </Center>
        <Heading as='h4'>
          {translate(isSubmitted ? 'pools.waitingForConfirmation' : 'common.signTransaction')}
        </Heading>
        <Flex gap={1} justifyContent='center' fontWeight='medium'>
          <RawText>{`${translate('Bridge')} ${bridgeAmountCryptoPrecision} ${
            sellAsset?.symbol ?? ''
          }`}</RawText>
        </Flex>
      </CardBody>
    )
  }, [
    steps.length,
    isComplete,
    isFailed,
    progress,
    progressPercentage,
    translate,
    isSubmitted,
    bridgeAmountCryptoPrecision,
    sellAsset?.symbol,
  ])

  const assetCards = useMemo(() => {
    return (
      <Stack mt={4}>
        {steps.map(
          (
            {
              asset,
              headerCopy,
              isActionable,
              serializedTxIndex,
              onSignAndBroadcast: handleSignAndBroadcast,
            },
            index,
          ) => {
            return (
              <TransactionRow
                key={asset.assetId}
                assetId={asset.assetId}
                headerCopy={headerCopy}
                onStart={handleStart}
                onSignAndBroadcast={handleSignAndBroadcast}
                serializedTxIndex={serializedTxIndex}
                isActive={index === activeStepIndex && !isFailed}
                isActionable={isActionable}
              />
            )
          },
        )}
      </Stack>
    )
  }, [steps, handleStart, activeStepIndex, isFailed])

  if (!(sellAsset && buyAsset)) return null

  return (
    <SlideTransition>
      <CardHeader>
        <WithBackButton onBack={canGoBack ? handleBack : undefined}>
          <Heading as='h5' textAlign='center'>
            <Text translation='Confirm' />
          </Heading>
        </WithBackButton>
      </CardHeader>
      {renderBody}
      <CardFooter flexDir='column' px={4}>
        {assetCards}
        {isComplete && (
          <Button mt={4} onClick={handleContinue}>
            {translate('common.continue')}
          </Button>
        )}
      </CardFooter>
    </SlideTransition>
  )
}
