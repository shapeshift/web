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
  onSign: () => void
  confirmedQuote: RfoxBridgeQuote
} & PropsWithChildren

export const ShareMultiStepStatus: React.FC<ReusableLpStatusProps> = ({
  confirmedQuote,
  onBack: handleBack,
  children,
}) => {
  const translate = useTranslate()
  const [activeStepIndex, setActiveStepIndex] = useState(0)
  const [canGoBack, setCanGoBack] = useState(true)
  const [isFailed, setIsFailed] = useState(false)

  const sellAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.sellAssetId))
  const buyAsset = useAppSelector(state => selectAssetById(state, confirmedQuote.buyAssetId))

  const bridgeAmountCryptoPrecision = useMemo(
    () => fromBaseUnit(confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision ?? 0),
    [confirmedQuote.bridgeAmountCryptoBaseUnit, sellAsset?.precision],
  )

  const txAssets: Asset[] = useMemo(() => {
    if (!sellAsset) return []
    return [sellAsset]
  }, [sellAsset])

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
    () => activeStepIndex === txAssets.length,
    [activeStepIndex, txAssets.length],
  )

  // TODO(gomes): implement progress
  const progress = useMemo(() => 1, [])
  const progressPercentage = useMemo(() => `${progress}%`, [progress])

  const renderBody = useMemo(() => {
    if (!txAssets.length) return null

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
          <Heading as='h4'>{translate('pools.transactionSubmitted')}</Heading>
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
    txAssets.length,
    isComplete,
    isFailed,
    progress,
    progressPercentage,
    translate,
    bridgeAmountCryptoPrecision,
    sellAsset?.symbol,
  ])

  const assetCards = useMemo(() => {
    return (
      <Stack mt={4}>
        {txAssets.map((asset, index) => {
          return (
            <TransactionRow
              key={asset.assetId}
              assetId={asset.assetId}
              amountCryptoPrecision={bridgeAmountCryptoPrecision}
              onStart={handleStart}
              onComplete={handleComplete}
              isActive={index === activeStepIndex && !isFailed}
              isActionable
            />
          )
        })}
      </Stack>
    )
  }, [
    txAssets,
    bridgeAmountCryptoPrecision,
    handleStart,
    handleComplete,
    activeStepIndex,
    isFailed,
  ])

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
