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
  HStack,
  Stack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { PropsWithChildren } from 'react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { FaX } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'

import { TransactionRow } from './TransactionRow'

import { Amount } from '@/components/Amount/Amount'
import { WithBackButton } from '@/components/MultiHopTrade/components/WithBackButton'
import { SlideTransition } from '@/components/SlideTransition'
import { RawText, Text } from '@/components/Text'
import { getMixPanel } from '@/lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from '@/lib/mixpanel/types'
import { assertUnreachable } from '@/lib/utils'
import type {
  LpConfirmedDepositQuote,
  LpConfirmedWithdrawalQuote,
} from '@/lib/utils/thorchain/lp/types'
import { AsymSide } from '@/lib/utils/thorchain/lp/types'
import { isLpConfirmedDepositQuote } from '@/lib/utils/thorchain/lp/utils'
import { fromQuote } from '@/pages/ThorChainLP/utils'
import { selectAssetById } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ReusableLpStatusProps = {
  handleBack: () => void
  handleRestart: () => void
  baseAssetId: AssetId
  confirmedQuote: LpConfirmedDepositQuote | LpConfirmedWithdrawalQuote
} & PropsWithChildren

export const ReusableLpStatus: React.FC<ReusableLpStatusProps> = ({
  baseAssetId,
  confirmedQuote,
  handleBack,
  handleRestart,
  children,
}) => {
  const translate = useTranslate()
  const mixpanel = getMixPanel()
  const [canGoBack, setCanGoBack] = useState(true)
  const hasTrackedStatus = useRef(false)

  const { assetId: poolAssetId, actionSide, action } = fromQuote(confirmedQuote)

  const poolAsset = useAppSelector(state => selectAssetById(state, poolAssetId))
  const baseAsset = useAppSelector(state => selectAssetById(state, baseAssetId))

  const poolAssets: Asset[] = useMemo(() => {
    if (!(poolAsset && baseAsset)) return []

    switch (actionSide) {
      case 'sym':
        return [baseAsset, poolAsset]
      case AsymSide.Rune:
        return [baseAsset]
      case AsymSide.Asset:
        return [poolAsset]
      default:
        assertUnreachable(actionSide)
    }
  }, [poolAsset, baseAsset, actionSide])

  const txAssets: Asset[] = useMemo(() => {
    if (!(poolAsset && baseAsset)) return []
    if (actionSide === 'sym' && action === 'deposit') return [baseAsset, poolAsset]

    switch (actionSide) {
      case 'sym':
      case AsymSide.Rune:
        return [baseAsset]
      case AsymSide.Asset:
        return [poolAsset]
      default:
        assertUnreachable(actionSide)
    }
  }, [poolAsset, baseAsset, actionSide, action])

  const initialTxAssetsStatuses = useMemo(
    () =>
      txAssets.map(asset => ({
        assetId: asset.assetId,
        status: undefined,
      })),
    [txAssets],
  )

  const [txAssetsStatuses, setTxAssetsStatuses] =
    useState<{ status: TxStatus | undefined; assetId: AssetId }[]>(initialTxAssetsStatuses)

  const activeStepIndex = useMemo(() => {
    // Initial state, no Tx just yet
    if (txAssetsStatuses.every(({ status }) => !status)) return 0
    // Still at the first step
    if (txAssetsStatuses[0].status === TxStatus.Pending) return 0
    if (
      txAssetsStatuses[1]?.status === TxStatus.Pending ||
      txAssetsStatuses[0].status === TxStatus.Confirmed
    )
      return 1

    // Just making TS happy
    return 0
  }, [txAssetsStatuses])

  const handleStatusUpdate = useCallback(
    (status: TxStatus, assetId: AssetId) => {
      setTxAssetsStatuses(prevStatuses => {
        const updatedStatuses = prevStatuses.map(txAssetStatus => {
          if (txAssetStatus.assetId === assetId) {
            return { ...txAssetStatus, status }
          }
          return txAssetStatus
        })
        return updatedStatuses
      })
    },
    [setTxAssetsStatuses],
  )

  const handleStart = useCallback(() => {
    setCanGoBack(false)
  }, [setCanGoBack])

  const isComplete = useMemo(
    () => txAssetsStatuses.every(({ status }) => status === TxStatus.Confirmed),
    [txAssetsStatuses],
  )

  const isFailed = useMemo(
    () => txAssetsStatuses.some(({ status }) => status === TxStatus.Failed),
    [txAssetsStatuses],
  )

  const isSubmitted = useMemo(
    () => txAssetsStatuses.some(({ status }) => status === TxStatus.Pending),
    [txAssetsStatuses],
  )

  useEffect(() => {
    // Prevent from firing multiple MixPanel events for the same outcome
    const hasTrackedStatusValue = hasTrackedStatus.current
    if (isComplete && !hasTrackedStatusValue)
      mixpanel?.track(
        action === 'deposit' ? MixPanelEvent.LpDepositSuccess : MixPanelEvent.LpWithdrawSuccess,
        confirmedQuote,
      )

    if (isFailed && !hasTrackedStatusValue)
      mixpanel?.track(
        action === 'deposit' ? MixPanelEvent.LpDepositFailed : MixPanelEvent.LpWithdrawFailed,
        confirmedQuote,
      )
  }, [confirmedQuote, isComplete, action, isFailed, mixpanel])

  const hStackDivider = useMemo(() => {
    if (actionSide) return <></>

    return <RawText mx={1}>{translate('common.and')}</RawText>
  }, [actionSide, translate])

  const stepProgress = useMemo(
    () => (activeStepIndex / txAssets.length) * 100,
    [activeStepIndex, txAssets.length],
  )

  const renderBody = useMemo(() => {
    if (!txAssets.length) return null

    const supplyAssets = poolAssets.map((asset, i) => {
      const amountCryptoPrecision =
        asset.assetId === thorchainAssetId
          ? isLpConfirmedDepositQuote(confirmedQuote)
            ? confirmedQuote.runeDepositAmountCryptoPrecision
            : confirmedQuote.runeWithdrawAmountCryptoPrecision
          : isLpConfirmedDepositQuote(confirmedQuote)
          ? confirmedQuote.assetDepositAmountCryptoPrecision
          : confirmedQuote.assetWithdrawAmountCryptoPrecision

      return (
        <Fragment key={`amount-${asset.assetId}`}>
          <Amount.Crypto
            value={amountCryptoPrecision}
            symbol={asset.symbol}
            maximumFractionDigits={4}
          />
          {i < poolAssets.length - 1 && (
            <>
              <RawText>&nbsp;</RawText>
              <Text translation='common.and' />
              <RawText>&nbsp;</RawText>
            </>
          )}
        </Fragment>
      )
    })

    const AssetAmounts = () => (
      <Flex gap={1} justifyContent='center' fontWeight='medium'>
        <RawText>
          {translate(
            isLpConfirmedDepositQuote(confirmedQuote) ? 'pools.supplying' : 'pools.withdrawing',
          )}
        </RawText>
        <HStack divider={hStackDivider}>{supplyAssets}</HStack>
      </Flex>
    )

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
          <Heading as='h4'>{translate('common.success')}</Heading>
          <AssetAmounts />
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
          <AssetAmounts />
        </CardBody>
      )
    }

    if (isSubmitted) {
      return (
        <CardBody display='flex' flexDir='column' alignItems='center' justifyContent='center'>
          <Center boxSize='80px' borderRadius='full' fontSize='xl' my={8}>
            <CircularProgress
              size='100px'
              thickness={4}
              isIndeterminate
              trackColor='background.surface.raised.base'
            >
              <CircularProgressLabel fontSize='md'>
                {activeStepIndex + 1} / {txAssets.length}
              </CircularProgressLabel>
            </CircularProgress>
          </Center>
          <Heading as='h4'>{translate('pools.waitingForConfirmation')}</Heading>
          <AssetAmounts />
        </CardBody>
      )
    }

    return (
      <CardBody textAlign='center'>
        <Center my={8}>
          <CircularProgress
            size='100px'
            thickness={4}
            value={stepProgress}
            trackColor='background.surface.raised.base'
          >
            <CircularProgressLabel fontSize='md'>
              {activeStepIndex + 1} / {txAssets.length}
            </CircularProgressLabel>
          </CircularProgress>
        </Center>
        <Heading as='h4'>{translate('common.signTransaction')}</Heading>
        <AssetAmounts />
      </CardBody>
    )
  }, [
    txAssets.length,
    isComplete,
    isFailed,
    poolAssets,
    stepProgress,
    activeStepIndex,
    translate,
    isSubmitted,
    confirmedQuote,
    hStackDivider,
  ])

  const assetCards = useMemo(() => {
    return (
      <Stack mt={4}>
        {txAssets.map((asset, index) => {
          const amountCryptoPrecision =
            asset.assetId === thorchainAssetId
              ? isLpConfirmedDepositQuote(confirmedQuote)
                ? confirmedQuote.runeDepositAmountCryptoPrecision
                : confirmedQuote.runeWithdrawAmountCryptoPrecision
              : isLpConfirmedDepositQuote(confirmedQuote)
              ? confirmedQuote.assetDepositAmountCryptoPrecision
              : confirmedQuote.assetWithdrawAmountCryptoPrecision

          return (
            <TransactionRow
              key={asset.assetId}
              assetId={asset.assetId}
              poolAssetId={poolAssetId}
              amountCryptoPrecision={amountCryptoPrecision}
              onStart={handleStart}
              onStatusUpdate={handleStatusUpdate}
              isActive={index === activeStepIndex && !isFailed && !isComplete}
              confirmedQuote={confirmedQuote}
            />
          )
        })}
      </Stack>
    )
  }, [
    txAssets,
    confirmedQuote,
    poolAssetId,
    handleStart,
    handleStatusUpdate,
    activeStepIndex,
    isFailed,
    isComplete,
  ])

  if (!(poolAsset && baseAsset)) return null

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
      {(isComplete || isFailed) && (
        <CardFooter flexDir='column'>
          <Button size='lg' mx={-2} onClick={handleRestart}>
            {translate('common.goBack')}
          </Button>
        </CardFooter>
      )}
    </SlideTransition>
  )
}
