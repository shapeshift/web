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
import type { Asset, MarketData } from '@shapeshiftoss/types'
import prettyMilliseconds from 'pretty-ms'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
import { useModal } from 'hooks/useModal/useModal'
import { bn, bnOrZero, convertPrecision } from 'lib/bignumber/bignumber'
import { isSome } from 'lib/utils'
import { THOR_PRECISION } from 'lib/utils/thorchain/constants'
import { estimateAddThorchainLiquidityPosition } from 'lib/utils/thorchain/lp'
import { usePools } from 'pages/ThorChainLP/hooks/usePools'
import { AsymSide } from 'pages/ThorChainLP/hooks/useUserLpData'
import { selectAssetById, selectAssets, selectMarketDataById } from 'state/slices/selectors'
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

  const assets = useAppSelector(selectAssets)
  const poolAssets = useMemo(() => {
    if (!parsedPools) return []

    return [...new Set(parsedPools.map(pool => assets[pool.assetId]).filter(isSome))]
  }, [assets, parsedPools])

  // TODO(gomes): Even though that's an edge case for users, and a bad practice, handling sym and asymm positions simultaneously
  // *is* possible and *is* something that both we and TS do. We can do one better than TS here however:
  // - When a user deposits symetrically, they can then deposit asymetrically, but only on the asset side
  // - When a user deposits asymetrically, no matter the side, they *can* deposit symetrically on the other side
  //   - They can also deposit asymetrically after that, but with one caveat: they can do so only if they deposited asym on the *asset* side only
  //     In other words, if they have an active asym. RUNE position, they can't deposit symetrically after that unless they withdraw
  //     The reason for that is that the RUNE side memo performs a nameservice operation, registering the asset address (or a placeholder)
  //
  //     We should handle this in the UI and block users from deposits that *will* fail, by detecting their current position(s)
  //     and not allowing them to select the sure-to-fail deposit types
  const defaultOpportunityId = useMemo(() => {
    if (!parsedPools) return undefined
    if (opportunityId) return undefined

    const firstAsymOpportunityId = parsedPools.find(pool => pool.asymSide === null)?.opportunityId

    return firstAsymOpportunityId
  }, [opportunityId, parsedPools])

  const [activeOpportunityId, setActiveOpportunityId] = useState(
    opportunityId ?? defaultOpportunityId,
  )

  const foundPool = useMemo(() => {
    if (!parsedPools) return undefined

    return parsedPools.find(pool => pool.opportunityId === activeOpportunityId)
  }, [activeOpportunityId, parsedPools])

  const _asset = useAppSelector(state => selectAssetById(state, foundPool?.assetId ?? ''))
  const rune = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const [asset, setAsset] = useState<Asset | undefined>(_asset)

  useEffect(() => {
    if (!(asset && parsedPools)) return

    const foundOpportunityId = (parsedPools ?? []).find(
      pool => pool.assetId === asset.assetId && pool.asymSide === null,
    )?.opportunityId
    if (!foundOpportunityId) return
    setActiveOpportunityId(foundOpportunityId)
  }, [asset, parsedPools])

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

  const assetMarketData = useAppSelector(state => selectMarketDataById(state, asset?.assetId ?? ''))
  const runeMarketData = useAppSelector(state => selectMarketDataById(state, rune?.assetId ?? ''))

  const [assetCryptoLiquidityAmount, setAssetCryptoLiquidityAmount] = React.useState<
    string | undefined
  >()
  const [assetFiatLiquidityAmount, setAssetFiatLiquidityAmount] = React.useState<
    string | undefined
  >()
  const [runeCryptoLiquidityAmount, setRuneCryptoLiquidityAmount] = React.useState<
    string | undefined
  >()
  const [runeFiatLiquidityAmount, setRuneFiatLiquidityAmount] = React.useState<string | undefined>()
  const [slippageRune, setSlippageRune] = React.useState<string | undefined>()
  const [shareOfPoolDecimalPercent, setShareOfPoolDecimalPercent] = React.useState<
    string | undefined
  >()

  const runePerAsset = useMemo(() => {
    if (!assetMarketData || !runeMarketData) return undefined
    return bn(assetMarketData.price).div(bn(runeMarketData.price)).toFixed()
  }, [assetMarketData, runeMarketData])

  const createHandleAddLiquidityInputChange = useCallback(
    (marketData: MarketData, isRune: boolean) => {
      return (value: string, isFiat?: boolean) => {
        if (!asset || !marketData) return undefined
        const crypto = (() => {
          if (!isFiat) return value
          const valueCryptoPrecision = bnOrZero(value)
            .div(bn(marketData.price ?? '0'))
            .toFixed()
          return valueCryptoPrecision
        })()
        const fiat = (() => {
          if (isFiat) return value
          const valueFiatUserCurrency = bnOrZero(value)
            .times(bn(marketData.price ?? '0'))
            .toFixed()
          return valueFiatUserCurrency
        })()

        if (isRune && bnOrZero(runePerAsset).isGreaterThan(0)) {
          setRuneCryptoLiquidityAmount(crypto)
          setRuneFiatLiquidityAmount(fiat)
          setAssetFiatLiquidityAmount(fiat)
          setAssetCryptoLiquidityAmount(bn(crypto).times(bnOrZero(runePerAsset)).toFixed())
        } else if (!isRune && bnOrZero(runePerAsset).isGreaterThan(0)) {
          setAssetCryptoLiquidityAmount(crypto)
          setAssetFiatLiquidityAmount(fiat)
          setRuneFiatLiquidityAmount(fiat)
          setRuneCryptoLiquidityAmount(bn(crypto).times(bnOrZero(runePerAsset)).toFixed())
        }
      }
    },
    [asset, runePerAsset],
  )

  useEffect(() => {
    ;(async () => {
      if (!runeCryptoLiquidityAmount || !assetCryptoLiquidityAmount || !asset) return

      const estimate = await estimateAddThorchainLiquidityPosition({
        runeAmountCryptoThorPrecision: convertPrecision({
          value: runeCryptoLiquidityAmount,
          inputExponent: 0,
          outputExponent: THOR_PRECISION,
        }).toFixed(),
        assetAmountCryptoThorPrecision: convertPrecision({
          value: assetCryptoLiquidityAmount,
          inputExponent: asset.precision,
          outputExponent: THOR_PRECISION,
        }).toFixed(),
        assetId: asset.assetId,
      })

      setSlippageRune(
        bnOrZero(estimate.slipPercent).div(100).times(runeCryptoLiquidityAmount).times(2).toFixed(),
      )
      setShareOfPoolDecimalPercent(estimate.poolShareDecimalPercent)
    })()
  }, [asset, assetCryptoLiquidityAmount, runeCryptoLiquidityAmount])

  const tradeAssetInputs = useMemo(() => {
    if (!(asset && rune && foundPool)) return null

    const assets: Asset[] = (() => {
      if (foundPool.asymSide === null) return [asset, rune]
      if (foundPool.asymSide === AsymSide.Rune) return [rune]
      if (foundPool.asymSide === AsymSide.Asset) return [asset]

      throw new Error('Invalid asym side')
    })()

    return assets.map(_asset => {
      const isRune = _asset.assetId === rune.assetId
      const marketData = isRune ? runeMarketData : assetMarketData
      const handleAddLiquidityInputChange = createHandleAddLiquidityInputChange(marketData, isRune)
      const cryptoAmount = isRune ? runeCryptoLiquidityAmount : assetCryptoLiquidityAmount
      const fiatAmount = isRune ? runeFiatLiquidityAmount : assetFiatLiquidityAmount

      return (
        <TradeAssetInput
          assetId={_asset?.assetId}
          assetIcon={_asset?.icon ?? ''}
          assetSymbol={_asset?.symbol ?? ''}
          onAccountIdChange={handleAccountIdChange}
          percentOptions={percentOptions}
          rightComponent={ReadOnlyAsset}
          formControlProps={formControlProps}
          onChange={handleAddLiquidityInputChange}
          cryptoAmount={cryptoAmount}
          fiatAmount={fiatAmount}
        />
      )
    })
  }, [
    asset,
    assetCryptoLiquidityAmount,
    assetFiatLiquidityAmount,
    assetMarketData,
    createHandleAddLiquidityInputChange,
    foundPool,
    handleAccountIdChange,
    percentOptions,
    rune,
    runeCryptoLiquidityAmount,
    runeFiatLiquidityAmount,
    runeMarketData,
  ])

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

  const buyAssetSearch = useModal('sellAssetSearch')
  const handlePoolAssetClick = useCallback(() => {
    buyAssetSearch.open({
      onClick: setAsset,
      title: 'pools.pool',
      assets: poolAssets,
    })
  }, [buyAssetSearch, poolAssets])

  const pairSelect = useMemo(() => {
    // We only want to show the pair select on standalone "Add Liquidity" - not on the pool page
    if (!defaultOpportunityId) return null
    return (
      <>
        <TradeAssetSelect
          assetId={asset?.assetId}
          onAssetClick={handlePoolAssetClick}
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
      </>
    )
  }, [asset?.assetId, defaultOpportunityId, handleAssetChange, handlePoolAssetClick])

  const handleAsymSideChange = useCallback(
    (asymSide: string | null) => {
      if (!(parsedPools && asset)) return

      // The null option gets casted as an empty string by the radio component so we cast it back to null
      const parsedAsymSide = (asymSide as AsymSide | '') || null
      const assetPools = parsedPools.filter(pool => pool.assetId === asset.assetId)
      const foundPool = assetPools.find(pool => pool.asymSide === parsedAsymSide)
      if (!foundPool) return

      setActiveOpportunityId(foundPool.opportunityId)
    },
    [asset, parsedPools],
  )

  if (!foundPool || !asset || !rune) return null

  return (
    <SlideTransition>
      {renderHeader}
      <Stack divider={divider} spacing={4} pb={4}>
        <Stack>
          <FormLabel px={6} mb={0} fontSize='sm'>
            {translate('pools.selectPair')}
          </FormLabel>
          {pairSelect}
        </Stack>
        <Stack>
          <FormLabel mb={0} px={6} fontSize='sm'>
            {translate('pools.depositAmounts')}
          </FormLabel>
          <DepositType
            assetId={asset.assetId}
            defaultOpportunityId={defaultOpportunityId}
            onAsymSideChange={handleAsymSideChange}
          />
          <Stack divider={pairDivider} spacing={0}>
            {tradeAssetInputs}
          </Stack>
        </Stack>
        <Collapse in={true}>
          <PoolSummary
            assetId={asset.assetId}
            runePerAsset={runePerAsset}
            shareOfPoolDecimalPercent={shareOfPoolDecimalPercent}
          />
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
              <Amount.Crypto value={slippageRune ?? 'TODO - loading'} symbol={rune.symbol} />
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
