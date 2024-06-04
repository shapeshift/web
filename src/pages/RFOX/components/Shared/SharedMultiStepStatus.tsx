import {
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
import { useCallback, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { FaX } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { RfoxBridgeQuote } from '../Bridge/types'
import { TransactionRow } from './TransactionRow'

type ReusableLpStatusProps = {
  onBack: () => void
  confirmedQuote: RfoxBridgeQuote
} & PropsWithChildren

export const ShareMultiStepStatus: React.FC<ReusableLpStatusProps> = ({
  confirmedQuote,
  onBack: handleBack,
  children,
}) => {
  const translate = useTranslate()
  // TODO(gomes): programmatic, this works for Arbitrum Bridge but we need to find a better way
  const numSteps = 2
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [canGoBack, setCanGoBack] = useState(true)
  const [isFailed, setIsFailed] = useState(false)

  const sellAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.sellAssetId))
  const buyAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.buyAssetId))

  const bridgeAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision ?? 0),
    [confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const steps: { asset: Asset; headerCopy: string; isActionable: boolean }[] = useMemo(() => {
    if (!(sellAsset && buyAsset)) return []
    return [
      {
        asset: sellAsset,
        // TODO(gomes): copy
        headerCopy: translate('common.sendAmountAsset', {
          amount: bridgeAmountCryptoPrecision,
          asset: sellAsset.symbol,
        }),
        // TODO(gomes): find a clean way to pass onSignAndBroadcast per step, *if* actionable
        isActionable: true,
      },
      { asset: buyAsset, headerCopy: 'Bridge Funds', isActionable: false },
    ]
  }, [bridgeAmountCryptoPrecision, buyAsset, sellAsset, translate])

  // TODO(gomes): handle L2 complete
  const handleComplete = useCallback(
    (status: TxStatus) => {
      if (status === TxStatus.Failed) return setIsFailed(true)
      if (status === TxStatus.Confirmed) return setActiveStepIndex(activeStepIndex + 1)
    },
    [activeStepIndex],
  )

  const handleStart = useCallback(() => {
    setCanGoBack(false)
  }, [setCanGoBack])

  // This allows us to either do a single step or multiple steps
  // Once a step is complete the next step is shown
  // If the active step is the same as the length of steps we can assume it is complete.
  const isComplete = useMemo(
    () => activeStepIndex === steps.length,
    [activeStepIndex, steps.length],
  )

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
        <Center my={8}>
          <CircularProgress
            size='100px'
            thickness={4}
            value={progress}
            trackColor='background.surface.raised.base'
          >
            <CircularProgressLabel fontSize='md'>{progressPercentage}</CircularProgressLabel>
          </CircularProgress>
        </Center>
        <Heading as='h4'>{translate('pools.waitingForConfirmation')}</Heading>
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
    bridgeAmountCryptoPrecision,
    sellAsset?.symbol,
  ])

  const assetCards = useMemo(() => {
    const handleSignAndBroadcast = async () => {
      console.log('TODO: handleSignAndBroadcast')
      await Promise.resolve()
    }
    return (
      <Stack mt={4}>
        {steps.map(({ asset, headerCopy, isActionable }, index) => {
          const onClick = () => {
            // TODO(gomes): remove me - this is for dev only so we can test the final step completing
            // by clicking on it, since we're not dispatching an actual Tx for now
            if (index === steps.length - 1) {
              handleComplete(TxStatus.Confirmed)
            }
          }
          return (
            <TransactionRow
              key={asset.assetId}
              assetId={asset.assetId}
              headerCopy={headerCopy}
              onStart={handleStart}
              onSignAndBroadcast={handleSignAndBroadcast}
              onComplete={handleComplete}
              // TODO(gomes): once again, don't forget to remove me
              onClick={onClick}
              isActive={index === activeStepIndex && !isFailed}
              isActionable={isActionable}
            />
          )
        })}
      </Stack>
    )
  }, [steps, handleStart, handleComplete, activeStepIndex, isFailed])

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
      </CardFooter>
      {children && (
        <CardFooter flexDir='column' px={4}>
          {children}
        </CardFooter>
      )}
    </SlideTransition>
  )
}
