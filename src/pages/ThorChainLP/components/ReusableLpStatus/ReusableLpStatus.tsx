import {
  Button,
  CardBody,
  CardFooter,
  Center,
  CircularProgress,
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

  const asset = useAppSelector(state => selectAssetById(state, pool?.assetId ?? ''))
  const baseAsset = useAppSelector(state => selectAssetById(state, baseAssetId))

  const assets: Asset[] = useMemo(() => {
    if (!(pool && asset && baseAsset)) return []

    switch (pool.asymSide) {
      case null:
        return [baseAsset, asset]
      case AsymSide.Rune:
        return [baseAsset]
      case AsymSide.Asset:
        return [asset]
      default:
        assertUnreachable(pool.asymSide)
    }
  }, [asset, baseAsset, pool])

  const handleComplete = useCallback(() => {
    setActiveStepIndex(activeStepIndex + 1)
  }, [activeStepIndex])

  // This allows us to either do a single step or multiple steps
  // Once a step is complete the next step is shown
  // If the active step is the same as the length of steps we can assume it is complete.
  const isComplete = useMemo(() => {
    return activeStepIndex === assets.length
  }, [activeStepIndex, assets.length])

  const hStackDivider = useMemo(() => {
    if (pool?.asymSide) return <></>

    return <RawText mx={1}>{translate('common.and')}</RawText>
  }, [pool?.asymSide, translate])

  const renderBody = useMemo(() => {
    if (!(pool && asset && rune)) return null

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
          key={`amount-${asset.assetId}`}
          value={amountCryptoPrecision}
          symbol={_asset.symbol}
        />
      )
    })

    return (
      <CardBody textAlign='center'>
        <Center my={8}>
          <CircularProgress
            size='100px'
            thickness={4}
            isIndeterminate
            trackColor='background.surface.raised.base'
          />
        </Center>
        <Heading as='h4'>{translate('pools.waitingForConfirmation')}</Heading>
        <Flex gap={1} justifyContent='center' fontWeight='medium'>
          <RawText>{translate('pools.supplying')}</RawText>
          <HStack divider={hStackDivider}>{supplyAssets}</HStack>
        </Flex>
      </CardBody>
    )
  }, [asset, assets, confirmedQuote, pool, hStackDivider, isComplete, translate])

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
              amountCryptoPrecision={amountCryptoPrecision}
              onComplete={handleComplete}
              isActive={index === activeStepIndex}
            />
          )
        })}
      </Stack>
    )
  }, [
    assets,
    confirmedQuote.runeCryptoLiquidityAmount,
    confirmedQuote.assetCryptoLiquidityAmount,
    handleComplete,
    activeStepIndex,
  ])

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
