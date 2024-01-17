import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Center,
  Flex,
  IconButton,
  Skeleton,
  Stack,
} from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import prettyMilliseconds from 'pretty-ms'
import { useCallback, useMemo } from 'react'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { Timeline, TimelineItem } from 'components/Timeline/Timeline'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { usePools } from 'pages/ThorChainLP/hooks/usePools'
import { AsymSide } from 'pages/ThorChainLP/hooks/useUserLpData'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'

import { PoolIcon } from '../PoolIcon'
import { AddLiquidityRoutePaths } from './types'

const dividerStyle = {
  marginLeft: '-1.2em',
  marginRight: '-1.2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 0,
  opacity: 1,
  zIndex: 4,
}

type AddLiquidityConfirmProps = {
  opportunityId?: string
  confirmedQuote: any
}

export const AddLiquidityConfirm = ({
  confirmedQuote,
  opportunityId,
}: AddLiquidityConfirmProps) => {
  console.log({ confirmedQuote })
  const translate = useTranslate()
  const history = useHistory()
  const backIcon = useMemo(() => <ArrowBackIcon />, [])

  const { data: parsedPools } = usePools()

  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined

    return parsedPools.find(pool => pool.opportunityId === opportunityId)
  }, [opportunityId, parsedPools])

  const asset = useAppSelector(state => selectAssetById(state, foundPool?.assetId ?? ''))
  const assetNetwork = useMemo(() => {
    if (!asset) return undefined
    return getChainAdapterManager().get(asset.chainId)?.getDisplayName()
  }, [asset])

  const rune = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const assetIds = useMemo(() => {
    if (!foundPool) return []
    return [foundPool.assetId, thorchainAssetId]
  }, [foundPool])

  const handleBack = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Input)
  }, [history])

  const handleConfirm = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Status)
  }, [history])

  const divider = useMemo(() => {
    if (foundPool?.asymSide) return <></>

    return (
      <Flex style={dividerStyle}>
        <Center borderRadius='full' bg='background.surface.base' boxSize='42px'>
          <Center boxSize='42px' borderRadius='full' bg='background.surface.raised.base'>
            <Card
              display='flex'
              boxSize='35px'
              alignItems='center'
              justifyContent='center'
              borderRadius='full'
              color='text.subtle'
              flexShrink={0}
              fontSize='xs'
            >
              <FaPlus />
            </Card>
          </Center>
        </Center>
      </Flex>
    )
  }, [foundPool?.asymSide])

  const depositCards = useMemo(() => {
    if (!foundPool || !asset || !rune) return null

    const assets: Asset[] = (() => {
      if (foundPool.asymSide === null) return [asset, rune]
      if (foundPool.asymSide === AsymSide.Rune) return [rune]
      if (foundPool.asymSide === AsymSide.Asset) return [asset]

      throw new Error('Invalid asym side')
    })()

    return (
      <Stack direction='row' divider={divider} position='relative'>
        {assets.map(_asset => {
          const amountCryptoPrecision =
            _asset.assetId === thorchainAssetId
              ? confirmedQuote.runeCryptoLiquidityAmount
              : confirmedQuote.assetCryptoLiquidityAmount
          const amountFiatUserCurrency =
            _asset.assetId === thorchainAssetId
              ? confirmedQuote.runeFiatLiquidityAmount
              : confirmedQuote.assetFiatLiquidityAmount

          return (
            <Card
              display='flex'
              alignItems='center'
              justifyContent='center'
              flexDir='column'
              gap={4}
              py={6}
              px={4}
              flex={1}
            >
              <AssetIcon size='sm' assetId={_asset.assetId} />
              <Stack textAlign='center' spacing={0}>
                <Amount.Crypto
                  fontWeight='bold'
                  value={amountCryptoPrecision}
                  symbol={_asset.symbol}
                />
                <Amount.Fiat fontSize='sm' color='text.subtle' value={amountFiatUserCurrency} />
              </Stack>
            </Card>
          )
        })}
      </Stack>
    )
  }, [
    asset,
    confirmedQuote.assetCryptoLiquidityAmount,
    confirmedQuote.assetFiatLiquidityAmount,
    confirmedQuote.runeCryptoLiquidityAmount,
    confirmedQuote.runeFiatLiquidityAmount,
    divider,
    foundPool,
    rune,
  ])

  if (!(foundPool && asset && rune)) return null

  return (
    <SlideTransition>
      <CardHeader display='flex' alignItems='center' gap={2}>
        <Flex flex={1}>
          <IconButton onClick={handleBack} variant='ghost' aria-label='back' icon={backIcon} />
        </Flex>
        <Flex textAlign='center'>{translate('common.confirm')}</Flex>
        <Flex flex={1}></Flex>
      </CardHeader>
      <CardBody pt={0}>
        <Stack spacing={8}>
          {depositCards}
          <Timeline>
            <TimelineItem>
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('pools.chainFee', { chain: 'ShapeShift' })}</Row.Label>
                <Row.Value>Free</Row.Value>
              </Row>
            </TimelineItem>
            <TimelineItem>
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('pools.chainFee', { chain: 'THORChain' })}</Row.Label>
                <Row.Value display='flex' gap={1}>
                  <Amount.Crypto value='0.02' symbol='RUNE' />
                  <Flex color='text.subtle'>
                    {'('}
                    <Amount.Fiat value='10.00' />
                    {')'}
                  </Flex>
                </Row.Value>
              </Row>
            </TimelineItem>
            <TimelineItem>
              <Row fontSize='sm' fontWeight='medium'>
                <Row.Label>{translate('pools.chainFee', { chain: assetNetwork })}</Row.Label>
                <Row.Value display='flex' gap={1}>
                  <Amount.Crypto value='0.02' symbol='ETH' />
                  <Flex color='text.subtle'>
                    {'('}
                    <Amount.Fiat value='10.00' />
                    {')'}
                  </Flex>
                </Row.Value>
              </Row>
            </TimelineItem>
            <TimelineItem>
              <Row fontSize='sm'>
                <Row.Label>{translate('pools.shareOfPool')}</Row.Label>
                <Row.Value>
                  <Amount.Percent value={confirmedQuote.shareOfPoolDecimalPercent} />
                </Row.Value>
              </Row>
            </TimelineItem>
          </Timeline>
        </Stack>
      </CardBody>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        py={4}
        bg='background.surface.raised.accent'
      >
        <Row fontSize='sm'>
          <Row.Label>{translate('pools.pool')}</Row.Label>
          <Row.Value>
            <Flex gap={2} alignItems='center' justifyContent='center'>
              <PoolIcon size='xs' assetIds={assetIds} />
              <RawText fontWeight='medium'>
                {asset.symbol}/{rune.symbol}
              </RawText>
            </Flex>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.slippage')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <Amount.Crypto
                value={confirmedQuote.slippageRune ?? 'TODO - loading'}
                symbol={rune.symbol}
              />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('bridge.waitTimeLabel')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <RawText fontWeight='bold'>{prettyMilliseconds(0)}</RawText>
            </Skeleton>
          </Row.Value>
        </Row>
      </CardFooter>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        bg='background.surface.raised.accent'
        borderBottomRadius='xl'
      >
        <Button mx={-2} size='lg' colorScheme='blue' onClick={handleConfirm}>
          {translate('pools.confirmAndDeposit')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
