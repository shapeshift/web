import {
  Button,
  CardBody,
  CardFooter,
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
import type { PropsWithChildren } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { assertUnreachable } from 'lib/utils'
import type {
  LpConfirmedDepositQuote,
  LpConfirmedWithdrawalQuote,
} from 'lib/utils/thorchain/lp/types'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import { isLpConfirmedDepositQuote } from 'lib/utils/thorchain/lp/utils'
import { fromOpportunityId } from 'pages/ThorChainLP/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TransactionRow } from './TransactionRow'

type ReusableLpStatusProps = {
  handleBack: () => void
  baseAssetId: AssetId
  confirmedQuote: LpConfirmedDepositQuote | LpConfirmedWithdrawalQuote
} & PropsWithChildren

export const ReusableLpStatus: React.FC<ReusableLpStatusProps> = ({
  baseAssetId,
  confirmedQuote,
  handleBack,
  children,
}) => {
  const translate = useTranslate()
  const [activeStepIndex, setActiveStepIndex] = useState(0)

  const { opportunityId } = confirmedQuote
  const { assetId, type: opportunityType } = fromOpportunityId(opportunityId)

  const poolAsset = useAppSelector(state => selectAssetById(state, assetId))
  const baseAsset = useAppSelector(state => selectAssetById(state, baseAssetId))

  const assets: Asset[] = useMemo(() => {
    if (!(poolAsset && baseAsset)) return []

    switch (opportunityType) {
      case AsymSide.Rune:
        return [baseAsset]
      case AsymSide.Asset:
        return [poolAsset]
      case 'sym':
        return [baseAsset, poolAsset]
      default:
        assertUnreachable(opportunityType)
    }
  }, [poolAsset, baseAsset, opportunityType])

  const handleComplete = useCallback(() => {
    setActiveStepIndex(activeStepIndex + 1)
  }, [activeStepIndex])

  // This allows us to either do a single step or multiple steps
  // Once a step is complete the next step is shown
  // If the active step is the same as the length of steps we can assume it is complete.
  const isComplete = useMemo(
    () => activeStepIndex === assets.length,
    [activeStepIndex, assets.length],
  )

  const hStackDivider = useMemo(() => {
    if (opportunityType) return <></>

    return <RawText mx={1}>{translate('common.and')}</RawText>
  }, [opportunityType, translate])

  const stepProgress = useMemo(
    () => (activeStepIndex / assets.length) * 100,
    [activeStepIndex, assets.length],
  )

  const renderBody = useMemo(() => {
    if (!assets.length) return null

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

    const supplyAssets = assets.map(_asset => {
      const amountCryptoPrecision =
        _asset.assetId === thorchainAssetId
          ? isLpConfirmedDepositQuote(confirmedQuote)
            ? confirmedQuote.runeDepositAmountCryptoPrecision
            : confirmedQuote.runeWithdrawAmountCryptoPrecision
          : isLpConfirmedDepositQuote(confirmedQuote)
          ? confirmedQuote.assetDepositAmountCryptoPrecision
          : confirmedQuote.assetWithdrawAmountCryptoPrecision
      return (
        <Amount.Crypto
          key={`amount-${_asset.assetId}`}
          value={amountCryptoPrecision}
          symbol={_asset.symbol}
          maximumFractionDigits={4}
        />
      )
    })

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
              {activeStepIndex + 1} / {assets.length}
            </CircularProgressLabel>
          </CircularProgress>
        </Center>
        <Heading as='h4'>{translate('pools.waitingForConfirmation')}</Heading>
        <Flex gap={1} justifyContent='center' fontWeight='medium'>
          <RawText>
            {translate(
              isLpConfirmedDepositQuote(confirmedQuote) ? 'pools.supplying' : 'pools.withdrawing',
            )}
          </RawText>
          <HStack divider={hStackDivider}>{supplyAssets}</HStack>
        </Flex>
      </CardBody>
    )
  }, [isComplete, assets, stepProgress, activeStepIndex, translate, hStackDivider, confirmedQuote])

  const assetCards = useMemo(() => {
    return (
      <Stack mt={4}>
        {assets.map((_asset, index) => {
          const amountCryptoPrecision =
            _asset.assetId === thorchainAssetId
              ? isLpConfirmedDepositQuote(confirmedQuote)
                ? confirmedQuote.runeDepositAmountCryptoPrecision
                : confirmedQuote.runeWithdrawAmountCryptoPrecision
              : isLpConfirmedDepositQuote(confirmedQuote)
              ? confirmedQuote.assetDepositAmountCryptoPrecision
              : confirmedQuote.assetWithdrawAmountCryptoPrecision
          return (
            <TransactionRow
              key={_asset.assetId}
              assetId={_asset.assetId}
              poolAssetId={poolAsset?.assetId}
              amountCryptoPrecision={amountCryptoPrecision}
              onComplete={handleComplete}
              isActive={index === activeStepIndex}
              confirmedQuote={confirmedQuote}
              asymSide={opportunityType !== 'sym' ? opportunityType : undefined}
            />
          )
        })}
      </Stack>
    )
  }, [assets, confirmedQuote, poolAsset?.assetId, handleComplete, activeStepIndex, opportunityType])

  if (!(poolAsset && baseAsset)) return null

  return (
    <SlideTransition>
      {renderBody}
      <CardFooter flexDir='column' px={4}>
        {assetCards}
      </CardFooter>
      {children && (
        <CardFooter flexDir='column' px={4}>
          {children}
        </CardFooter>
      )}
      {isComplete && (
        <CardFooter flexDir='column'>
          <Button size='lg' mx={-2} onClick={handleBack}>
            {translate('common.goBack')}
          </Button>
        </CardFooter>
      )}
    </SlideTransition>
  )
}
