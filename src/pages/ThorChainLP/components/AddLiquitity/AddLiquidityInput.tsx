import { ArrowBackIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Button,
  CardFooter,
  CardHeader,
  Center,
  Collapse,
  Divider,
  Flex,
  FormLabel,
  IconButton,
  Skeleton,
  Stack,
  StackDivider,
} from '@chakra-ui/react'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import prettyMilliseconds from 'pretty-ms'
import React, { useCallback, useMemo } from 'react'
import { BiSolidBoltCircle } from 'react-icons/bi'
import { FaPlus } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { TradeAssetSelect } from 'components/MultiHopTrade/components/AssetSelection'
import { SlippagePopover } from 'components/MultiHopTrade/components/SlippagePopover'
import { TradeAssetInput } from 'components/MultiHopTrade/components/TradeAssetInput'
import { Row } from 'components/Row/Row'
import { SlideTransition } from 'components/SlideTransition'
import { RawText } from 'components/Text'
import { useBrowserRouter } from 'hooks/useBrowserRouter/useBrowserRouter'
import { usePools } from 'pages/ThorChainLP/hooks/usePools'
import { AsymSide } from 'pages/ThorChainLP/hooks/useUserLpData'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import type { AddLiquidityProps } from './AddLiquidity'
import { DepositType } from './components/DepositType'
import { PoolSummary } from './components/PoolSummary'
import { ReadOnlyAsset } from './components/ReadOnlyAsset'
import { AddLiquidityRoutePaths } from './types'

const buttonProps = { flex: 1, justifyContent: 'space-between' }

const formControlProps = {
  borderRadius: 0,
  background: 'transparent',
  borderWidth: 0,
  paddingBottom: 0,
  paddingTop: 0,
}
const dividerStyle = {
  borderBottomWidth: 0,
  marginBottom: 8,
  marginTop: 12,
}

export const AddLiquidityInput: React.FC<AddLiquidityProps> = ({
  headerComponent,
  opportunityId,
}) => {
  const translate = useTranslate()
  const { history: browserHistory } = useBrowserRouter()
  const history = useHistory()
  const divider = useMemo(() => <StackDivider borderColor='border.base' />, [])

  const { data: parsedPools } = usePools()

  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined

    return parsedPools.find(pool => pool.opportunityId === opportunityId)
  }, [opportunityId, parsedPools])

  const handleAssetChange = useCallback((asset: Asset) => {
    console.info(asset)
  }, [])

  const handleBackClick = useCallback(() => {
    browserHistory.push('/pools')
  }, [browserHistory])

  const handleAccountIdChange = useCallback(() => {
    console.info('account change')
  }, [])

  const handleSubmit = useCallback(() => {
    history.push(AddLiquidityRoutePaths.Confirm)
  }, [history])

  const percentOptions = useMemo(() => [], [])

  const backIcon = useMemo(() => <ArrowBackIcon />, [])

  const pairDivider = useMemo(() => {
    return (
      <Flex alignItems='center' display='flex' style={dividerStyle}>
        <Divider borderColor='border.base' />
        <Center
          boxSize='32px'
          borderWidth={1}
          borderColor='border.base'
          borderRadius='full'
          color='text.subtle'
          flexShrink={0}
          fontSize='xs'
        >
          <FaPlus />
        </Center>
        <Divider borderColor='border.base' />
      </Flex>
    )
  }, [])

  const renderHeader = useMemo(() => {
    if (headerComponent) return headerComponent
    return (
      <CardHeader display='flex' alignItems='center' justifyContent='space-between'>
        <IconButton
          onClick={handleBackClick}
          variant='ghost'
          icon={backIcon}
          aria-label='go back'
        />
        {translate('pools.addLiquidity')}
        <SlippagePopover />
      </CardHeader>
    )
  }, [backIcon, handleBackClick, headerComponent, translate])

  const asset = useAppSelector(state => selectAssetById(state, foundPool?.assetId ?? ''))
  const rune = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const tradeAssetInputs = useMemo(() => {
    if (!(asset && rune && foundPool)) return null

    const assets: Asset[] = (() => {
      if (foundPool.asymSide === null) return [asset, rune]
      if (foundPool.asymSide === AsymSide.Rune) return [rune]
      if (foundPool.asymSide === AsymSide.Asset) return [asset]

      throw new Error('Invalid asym side')
    })()

    return assets.map(_asset => (
      <TradeAssetInput
        assetId={_asset?.assetId}
        assetIcon={_asset?.icon ?? ''}
        assetSymbol={_asset?.symbol ?? ''}
        onAccountIdChange={handleAccountIdChange}
        percentOptions={percentOptions}
        rightComponent={ReadOnlyAsset}
        formControlProps={formControlProps}
      />
    ))
  }, [asset, foundPool, handleAccountIdChange, percentOptions, rune])

  const symAlert = useMemo(() => {
    if (!(foundPool && rune && asset)) return null
    if (!foundPool.asymSide) return null

    const from = foundPool.asymSide === AsymSide.Rune ? rune.symbol : asset?.symbol
    const to = foundPool.asymSide === AsymSide.Rune ? asset?.symbol : rune.symbol

    return (
      <Alert status='info' mx={-2} width='auto'>
        <AlertIcon as={BiSolidBoltCircle} />
        <AlertDescription fontSize='sm' fontWeight='medium'>
          {translate('pools.symAlert', { from, to })}
        </AlertDescription>
      </Alert>
    )
  }, [asset, foundPool, rune, translate])

  if (!foundPool || !asset || !rune) return null

  return (
    <SlideTransition>
      {renderHeader}
      <Stack divider={divider} spacing={4} pb={4}>
        <Stack>
          <FormLabel px={6} mb={0} fontSize='sm'>
            {translate('pools.selectPair')}
          </FormLabel>
          <TradeAssetSelect
            assetId={asset?.assetId}
            onAssetChange={handleAssetChange}
            isLoading={false}
            mb={0}
            buttonProps={buttonProps}
          />
          <TradeAssetSelect
            assetId={thorchainAssetId}
            onAssetChange={handleAssetChange}
            isLoading={false}
            mb={0}
            buttonProps={buttonProps}
          />
        </Stack>
        <Stack>
          <FormLabel mb={0} px={6} fontSize='sm'>
            {translate('pools.depositAmounts')}
          </FormLabel>
          <DepositType assetId={asset.assetId} asymSide={foundPool.asymSide} />
          <Stack divider={pairDivider} spacing={0}>
            {tradeAssetInputs}
          </Stack>
        </Stack>
        <Collapse in={true}>
          <PoolSummary assetId={foundPool.assetId} />
        </Collapse>
      </Stack>
      <CardFooter
        borderTopWidth={1}
        borderColor='border.subtle'
        flexDir='column'
        gap={4}
        px={6}
        py={4}
        bg='background.surface.raised.accent'
      >
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.slippage')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <Amount.Crypto value={'0'} symbol={rune.symbol} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.gasFee')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <Amount.Fiat value={'0'} />
            </Skeleton>
          </Row.Value>
        </Row>
        <Row fontSize='sm' fontWeight='medium'>
          <Row.Label>{translate('common.fees')}</Row.Label>
          <Row.Value>
            <Skeleton isLoaded={true}>
              <Amount.Fiat value={'0'} />
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
        {symAlert}
        <Button mx={-2} size='lg' colorScheme='blue' onClick={handleSubmit}>
          {translate('pools.addLiquidity')}
        </Button>
      </CardFooter>
    </SlideTransition>
  )
}
