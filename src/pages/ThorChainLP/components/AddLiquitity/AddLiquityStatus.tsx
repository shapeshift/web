import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Collapse,
  Flex,
  Heading,
  HStack,
  Stack,
} from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import { useCallback, useMemo, useState } from 'react'
import { FaCheck } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { usePools } from 'pages/ThorChainLP/hooks/usePools'
import { AsymSide } from 'pages/ThorChainLP/hooks/useUserLpData'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddLiquidityRoutePaths } from './types'

type AddLiquidityStatusProps = {
  opportunityId?: string
}

export const AddLiquidityStatus = ({ opportunityId }: AddLiquidityStatusProps) => {
  const translate = useTranslate()
  const history = useHistory()
  const [firstTx, setFirstTx] = useState(TxStatus.Unknown)
  const [secondTx, setSecondTx] = useState(TxStatus.Pending)
  const [isComplete, setIsComplete] = useState(false)

  const { data: parsedPools } = usePools()

  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined

    return parsedPools.find(pool => pool.opportunityId === opportunityId)
  }, [opportunityId, parsedPools])

  const asset = useAppSelector(state => selectAssetById(state, foundPool?.assetId ?? ''))
  const rune = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const assets: Asset[] = useMemo(() => {
    if (!(foundPool && asset && rune)) return []

    if (foundPool.asymSide === null) return [asset, rune]
    if (foundPool.asymSide === AsymSide.Rune) return [rune]
    if (foundPool.asymSide === AsymSide.Asset) return [asset]

    throw new Error('Invalid asym side')
  }, [asset, foundPool, rune])

  const handleGoBack = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Input)
  }, [history])

  const handleComplete = useCallback(() => {
    setSecondTx(TxStatus.Confirmed)
    setIsComplete(true)
  }, [])

  const handleNext = useCallback(() => {
    setFirstTx(TxStatus.Confirmed)
    setSecondTx(TxStatus.Unknown)
  }, [])

  const hStackDivider = useMemo(() => {
    if (foundPool?.asymSide) return <></>

    return <RawText mx={1}>{translate('common.and')}</RawText>
  }, [foundPool?.asymSide, translate])

  const renderBody = useMemo(() => {
    if (!(foundPool && asset && rune)) return null

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

    const supplyAssets = assets.map(_asset => <Amount.Crypto value='100' symbol={_asset.symbol} />)

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
  }, [asset, assets, foundPool, hStackDivider, isComplete, rune, translate])

  const assetCards = useMemo(() => {
    return assets.map((asset, index) => (
      <Card key={asset.assetId}>
        <CardHeader gap={2} display='flex' flexDir='row' alignItems='center'>
          <AssetIcon size='xs' assetId={asset.assetId} />
          <Amount.Crypto fontWeight='bold' value='100' symbol={asset.symbol} />{' '}
          <Flex ml='auto' alignItems='center' gap={2}>
            {(index === 0 && firstTx === TxStatus.Confirmed) ||
            (index === 1 && secondTx === TxStatus.Confirmed) ? (
              <>
                <Button size='xs'>{translate('common.seeDetails')}</Button>
                <Center
                  bg='background.success'
                  boxSize='24px'
                  borderRadius='full'
                  color='text.success'
                  fontSize='xs'
                >
                  <FaCheck />
                </Center>
              </>
            ) : (
              <CircularProgress size='24px' />
            )}
          </Flex>
        </CardHeader>
        <Collapse in={index === 0 ? firstTx === TxStatus.Unknown : secondTx === TxStatus.Unknown}>
          <CardBody display='flex' flexDir='column' gap={2}>
            <Row fontSize='sm'>
              <Row.Label>{translate('common.gasFee')}</Row.Label>
              <Row.Value>
                <Amount.Crypto value='0.02' symbol={asset.symbol} />
              </Row.Value>
            </Row>
            <Button
              mx={-2}
              size='lg'
              colorScheme='blue'
              onClick={index === 0 ? handleNext : handleComplete}
            >
              {translate('common.signTransaction')}
            </Button>
          </CardBody>
        </Collapse>
      </Card>
    ))
  }, [assets, firstTx, secondTx, translate, handleNext, handleComplete])

  if (!foundPool) return null

  return (
    <SlideTransition>
      {renderBody}
      <CardFooter flexDir='column' px={4}>
        <Stack mt={4}>{assetCards}</Stack>
      </CardFooter>
      {isComplete && (
        <CardFooter flexDir='column'>
          <Button size='lg' mx={-2} onClick={handleGoBack}>
            {translate('common.goBack')}
          </Button>
        </CardFooter>
      )}
    </SlideTransition>
  )
}
