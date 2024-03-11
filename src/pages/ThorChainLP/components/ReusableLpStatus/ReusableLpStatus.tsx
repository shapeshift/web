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
import type { PropsWithChildren } from 'react'
import { Fragment, useCallback, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { WithBackButton } from 'components/MultiHopTrade/components/WithBackButton'
import { SlideTransition } from 'components/SlideTransition'
import { RawText, Text } from 'components/Text'
import { assertUnreachable } from 'lib/utils'
import type {
  LpConfirmedDepositQuote,
  LpConfirmedWithdrawalQuote,
} from 'lib/utils/thorchain/lp/types'
import { AsymSide } from 'lib/utils/thorchain/lp/types'
import {
  isLpConfirmedDepositQuote,
  isLpConfirmedWithdrawalQuote,
} from 'lib/utils/thorchain/lp/utils'
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

  const poolAssets: Asset[] = useMemo(() => {
    if (!(poolAsset && baseAsset)) return []

    switch (opportunityType) {
      case 'sym':
        return [baseAsset, poolAsset]
      case AsymSide.Rune:
        return [baseAsset]
      case AsymSide.Asset:
        return [poolAsset]
      default:
        assertUnreachable(opportunityType)
    }
  }, [poolAsset, baseAsset, opportunityType])

  const txAssets: Asset[] = useMemo(() => {
    if (!(poolAsset && baseAsset)) return []

    const isDeposit = isLpConfirmedDepositQuote(confirmedQuote)
    if (opportunityType === 'sym' && isDeposit) return [baseAsset, poolAsset]

    switch (opportunityType) {
      case 'sym':
      case AsymSide.Rune:
        return [baseAsset]
      case AsymSide.Asset:
        return [poolAsset]
      default:
        assertUnreachable(opportunityType)
    }
  }, [poolAsset, baseAsset, confirmedQuote, opportunityType])

  const handleComplete = useCallback(() => {
    setActiveStepIndex(activeStepIndex + 1)
  }, [activeStepIndex])

  // This allows us to either do a single step or multiple steps
  // Once a step is complete the next step is shown
  // If the active step is the same as the length of steps we can assume it is complete.
  const isComplete = useMemo(
    () => activeStepIndex === txAssets.length,
    [activeStepIndex, txAssets.length],
  )

  const hStackDivider = useMemo(() => {
    if (opportunityType) return <></>

    return <RawText mx={1}>{translate('common.and')}</RawText>
  }, [opportunityType, translate])

  const stepProgress = useMemo(
    () => (activeStepIndex / txAssets.length) * 100,
    [activeStepIndex, txAssets.length],
  )

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

    const supplyAssets = poolAssets.map((_asset, i) => {
      const amountCryptoPrecision =
        _asset.assetId === thorchainAssetId
          ? isLpConfirmedDepositQuote(confirmedQuote)
            ? confirmedQuote.runeDepositAmountCryptoPrecision
            : confirmedQuote.runeWithdrawAmountCryptoPrecision
          : isLpConfirmedDepositQuote(confirmedQuote)
          ? confirmedQuote.assetDepositAmountCryptoPrecision
          : confirmedQuote.assetWithdrawAmountCryptoPrecision
      return (
        <Fragment key={`amount-${_asset.assetId}`}>
          <Amount.Crypto
            value={amountCryptoPrecision}
            symbol={_asset.symbol}
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
  }, [
    txAssets.length,
    isComplete,
    poolAssets,
    stepProgress,
    activeStepIndex,
    translate,
    confirmedQuote,
    hStackDivider,
  ])

  const assetCards = useMemo(() => {
    return (
      <Stack mt={4}>
        {txAssets.map((_asset, index) => {
          const amountCryptoPrecision =
            _asset.assetId === thorchainAssetId
              ? isLpConfirmedDepositQuote(confirmedQuote)
                ? confirmedQuote.runeDepositAmountCryptoPrecision
                : confirmedQuote.runeWithdrawAmountCryptoPrecision
              : isLpConfirmedDepositQuote(confirmedQuote)
              ? confirmedQuote.assetDepositAmountCryptoPrecision
              : confirmedQuote.assetWithdrawAmountCryptoPrecision

          const isSymWithdraw =
            isLpConfirmedWithdrawalQuote(confirmedQuote) && opportunityType === 'sym'

          /*
            Symmetrical withdrawals withdraw both asset amounts in a single TX.
            In this case, we want to provide the pool asset amount to TransactionRow in additional to the rune amount
            so we render both for the user.
          */
          const poolAmountCryptoPrecision = isSymWithdraw
            ? confirmedQuote.assetWithdrawAmountCryptoPrecision
            : undefined

          return (
            <TransactionRow
              key={_asset.assetId}
              assetId={_asset.assetId}
              poolAssetId={poolAsset?.assetId}
              amountCryptoPrecision={amountCryptoPrecision}
              poolAmountCryptoPrecision={poolAmountCryptoPrecision}
              onComplete={handleComplete}
              isActive={index === activeStepIndex}
              confirmedQuote={confirmedQuote}
              asymSide={opportunityType !== 'sym' ? opportunityType : undefined}
            />
          )
        })}
      </Stack>
    )
  }, [
    txAssets,
    confirmedQuote,
    poolAsset?.assetId,
    handleComplete,
    activeStepIndex,
    opportunityType,
  ])

  if (!(poolAsset && baseAsset)) return null

  return (
    <SlideTransition>
      <CardHeader>
        <WithBackButton onBack={handleBack}>
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
