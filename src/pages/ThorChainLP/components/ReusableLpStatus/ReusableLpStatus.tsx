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
import { rune } from 'test/mocks/assets'
import { Amount } from 'components/Amount/Amount'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { assertUnreachable } from 'lib/utils'
import { AsymSide, type ConfirmedQuote } from 'lib/utils/thorchain/lp/types'
import { usePools } from 'pages/ThorChainLP/queries/hooks/usePools'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { TransactionRow } from './TransactionRow'

type ReusableLpStatusProps = {
  handleBack: () => void
  baseAssetId: AssetId
  confirmedQuote: ConfirmedQuote
} & PropsWithChildren

export const ReusableLpStatus: React.FC<ReusableLpStatusProps> = ({
  baseAssetId,
  confirmedQuote,
  handleBack,
  children,
}) => {
  const translate = useTranslate()
  const [activeStepIndex, setActiveStepIndex] = useState(0)

  const { data: parsedPools } = usePools()

  const pool = useMemo(() => {
    if (!parsedPools) return undefined

    return parsedPools.find(pool => pool.opportunityId === confirmedQuote.opportunityId)
  }, [confirmedQuote.opportunityId, parsedPools])

  const poolAsset = useAppSelector(state => selectAssetById(state, pool?.assetId ?? ''))
  const baseAsset = useAppSelector(state => selectAssetById(state, baseAssetId))

  const assets: Asset[] = useMemo(() => {
    if (!(pool && poolAsset && baseAsset)) return []

    switch (pool.asymSide) {
      case null:
        return [baseAsset, poolAsset]
      case AsymSide.Rune:
        return [baseAsset]
      case AsymSide.Asset:
        return [poolAsset]
      default:
        assertUnreachable(pool.asymSide)
    }
  }, [poolAsset, baseAsset, pool])

  const handleComplete = useCallback(() => {
    if (activeStepIndex === assets.length) return

    setActiveStepIndex(activeStepIndex + 1)
  }, [activeStepIndex, assets.length])

  // This allows us to either do a single step or multiple steps
  // Once a step is complete the next step is shown
  // If the active step is the same as the length of steps we can assume it is complete.
  const isComplete = useMemo(
    () => activeStepIndex === assets.length,
    [activeStepIndex, assets.length],
  )

  const hStackDivider = useMemo(() => {
    if (pool?.asymSide) return <></>

    return <RawText mx={1}>{translate('common.and')}</RawText>
  }, [pool?.asymSide, translate])

  const stepProgress = useMemo(
    () => (activeStepIndex / assets.length) * 100,
    [activeStepIndex, assets.length],
  )

  const renderBody = useMemo(() => {
    if (!(pool && poolAsset && rune)) return null

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
          ? confirmedQuote.runeCryptoLiquidityAmount
          : confirmedQuote.assetCryptoLiquidityAmount
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
              {activeStepIndex} / {assets.length}
            </CircularProgressLabel>
          </CircularProgress>
        </Center>
        <Heading as='h4'>{translate('pools.waitingForConfirmation')}</Heading>
        <Flex gap={1} justifyContent='center' fontWeight='medium'>
          <RawText>{translate('pools.supplying')}</RawText>
          <HStack divider={hStackDivider}>{supplyAssets}</HStack>
        </Flex>
      </CardBody>
    )
  }, [
    pool,
    poolAsset,
    isComplete,
    assets,
    stepProgress,
    activeStepIndex,
    translate,
    hStackDivider,
    confirmedQuote.runeCryptoLiquidityAmount,
    confirmedQuote.assetCryptoLiquidityAmount,
  ])

  const assetCards = useMemo(() => {
    return (
      <Stack mt={4}>
        {assets.map((_asset, index) => {
          const amountCryptoPrecision =
            _asset.assetId === thorchainAssetId
              ? confirmedQuote.runeCryptoLiquidityAmount
              : confirmedQuote.assetCryptoLiquidityAmount
          return (
            <TransactionRow
              key={_asset.assetId}
              assetId={_asset.assetId}
              poolAssetId={poolAsset?.assetId}
              accountIds={confirmedQuote.accountIds}
              amountCryptoPrecision={amountCryptoPrecision}
              onComplete={handleComplete}
              isActive={index === activeStepIndex}
              confirmedQuote={confirmedQuote}
            />
          )
        })}
      </Stack>
    )
  }, [assets, confirmedQuote, poolAsset?.assetId, handleComplete, activeStepIndex])

  if (!(pool && poolAsset && baseAsset)) return null

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
