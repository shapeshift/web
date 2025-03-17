import { Flex } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { matchPath, Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { LimitOrderConfirm as LimitOrderShared } from '../LimitOrderV2/LimitOrderConfirm'
import { SlideTransitionRoute } from '../SlideTransitionRoute'
import { AllowanceApproval } from './components/AllowanceApproval'
import { LimitOrderConfirm } from './components/LimitOrderConfirm'
import { LimitOrderInput } from './components/LimitOrderInput'
import { LimitOrderList } from './components/LimitOrderList'
import { PlaceLimitOrder } from './components/PlaceLimitOrder'
import { LimitOrderRoutePaths } from './types'

import type { TradeInputTab } from '@/components/MultiHopTrade/types'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { fromBaseUnit } from '@/lib/math'
import type { TradeRouterMatchParams } from '@/pages/Trade/types'
import { LIMIT_ORDER_ROUTE_ASSET_SPECIFIC } from '@/Routes/RoutesCommon'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import type { LimitPriceMode, PriceDirection } from '@/state/slices/limitOrderInputSlice/constants'
import { limitOrderInput } from '@/state/slices/limitOrderInputSlice/limitOrderInputSlice'
import {
  selectInputBuyAsset,
  selectInputSellAmountCryptoBaseUnit,
  selectInputSellAsset,
  selectLimitPriceDirection,
  selectLimitPriceForSelectedPriceDirection,
  selectLimitPriceMode,
} from '@/state/slices/limitOrderInputSlice/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

type LimitOrderProps = {
  tradeInputRef: React.MutableRefObject<HTMLDivElement | null>
  isCompact?: boolean
  isRewritingUrl?: boolean
  defaultBuyAssetId?: string
  defaultSellAssetId?: string
  onChangeTab: (newTab: TradeInputTab) => void
}

export const LimitOrder = ({
  isCompact,
  isRewritingUrl,
  defaultBuyAssetId,
  defaultSellAssetId,
  tradeInputRef,
  onChangeTab,
}: LimitOrderProps) => {
  const location = useLocation()
  const history = useHistory()
  const dispatch = useAppDispatch()
  const isNewLimitFlowEnabled = useFeatureFlag('NewLimitFlow')
  const [isInitialized, setIsInitialized] = useState(false)

  const match = useMemo(
    () =>
      matchPath<TradeRouterMatchParams>(location.pathname, {
        path: LIMIT_ORDER_ROUTE_ASSET_SPECIFIC,
        exact: true,
      }),
    [location.pathname],
  )

  const {
    chainId,
    assetSubId,
    sellChainId,
    sellAssetSubId,
    sellAmountCryptoBaseUnit,
    limitPriceMode: routeLimitPriceMode,
    limitPriceDirection: routeLimitPriceDirection,
    limitPrice: routeLimitPrice,
  } = match?.params || {}

  // Get the necessary state for URL rewriting
  const buyAsset = useAppSelector(selectInputBuyAsset)
  const sellAsset = useAppSelector(selectInputSellAsset)
  const sellInputAmountCryptoBaseUnit = useAppSelector(selectInputSellAmountCryptoBaseUnit)
  const limitPriceMode = useAppSelector(selectLimitPriceMode)
  const limitPriceDirection = useAppSelector(selectLimitPriceDirection)
  const limitPriceForSelectedDirection = useAppSelector(selectLimitPriceForSelectedPriceDirection)

  const buyAssetId = useMemo(() => {
    if (defaultBuyAssetId) return defaultBuyAssetId
    if (chainId && assetSubId) return `${chainId}/${assetSubId}`
  }, [defaultBuyAssetId, chainId, assetSubId])

  const sellAssetId = useMemo(() => {
    if (defaultSellAssetId) return defaultSellAssetId
    if (sellChainId && sellAssetSubId) return `${sellChainId}/${sellAssetSubId}`
  }, [defaultSellAssetId, sellChainId, sellAssetSubId])

  const routeSellAsset = useAppSelector(state => selectAssetById(state, sellAssetId ?? ''))
  const routeBuyAsset = useAppSelector(state => selectAssetById(state, buyAssetId ?? ''))

  // Initialize state from URL params
  useEffect(() => {
    if (isInitialized) return

    if (routeBuyAsset) {
      dispatch(limitOrderInput.actions.setBuyAsset(routeBuyAsset))
    }

    if (routeSellAsset) {
      dispatch(limitOrderInput.actions.setSellAsset(routeSellAsset))
    }

    if (sellAmountCryptoBaseUnit && routeSellAsset) {
      dispatch(
        limitOrderInput.actions.setSellAmountCryptoPrecision(
          fromBaseUnit(sellAmountCryptoBaseUnit, routeSellAsset.precision),
        ),
      )
    }

    if (routeLimitPriceDirection) {
      dispatch(
        limitOrderInput.actions.setLimitPriceDirection(routeLimitPriceDirection as PriceDirection),
      )
    }

    if (routeLimitPriceMode) {
      dispatch(limitOrderInput.actions.setLimitPriceMode(routeLimitPriceMode as LimitPriceMode))
    }

    if (routeLimitPrice && routeLimitPrice !== '0') {
      dispatch(
        limitOrderInput.actions.setLimitPrice({
          marketPriceBuyAsset: routeLimitPrice,
        }),
      )
    }

    setIsInitialized(true)
  }, [
    dispatch,
    routeBuyAsset,
    routeSellAsset,
    sellAmountCryptoBaseUnit,
    routeLimitPriceMode,
    routeLimitPriceDirection,
    routeLimitPrice,
    isInitialized,
  ])

  // Implement URL rewriting logic
  useEffect(() => {
    if (isRewritingUrl && isInitialized && buyAsset && sellAsset) {
      const sellAmountBaseUnit = sellInputAmountCryptoBaseUnit ?? sellAmountCryptoBaseUnit ?? ''
      const currentLimitPriceMode = limitPriceMode
      const currentLimitPriceDirection = limitPriceDirection
      const currentLimitPrice = limitPriceForSelectedDirection

      history.push(
        `/limit/${buyAsset.assetId}/${sellAsset.assetId}/${sellAmountBaseUnit}/${currentLimitPriceMode}/${currentLimitPriceDirection}/${currentLimitPrice}`,
      )
    }
  }, [
    isInitialized,
    isRewritingUrl,
    buyAsset,
    sellAsset,
    history,
    sellInputAmountCryptoBaseUnit,
    sellAmountCryptoBaseUnit,
    limitPriceMode,
    limitPriceDirection,
    limitPriceForSelectedDirection,
  ])

  const renderLimitOrderInput = useCallback(() => {
    return (
      <LimitOrderInput
        isCompact={isCompact}
        tradeInputRef={tradeInputRef}
        onChangeTab={onChangeTab}
        noExpand
      />
    )
  }, [isCompact, tradeInputRef, onChangeTab])

  const renderLimitOrderConfirm = useCallback(() => {
    return <LimitOrderConfirm />
  }, [])

  const renderLimitOrderShared = useCallback(() => {
    return <LimitOrderShared />
  }, [])

  const renderAllowanceApproval = useCallback(() => {
    return <AllowanceApproval />
  }, [])

  const renderPlaceOrder = useCallback(() => {
    return <PlaceLimitOrder isCompact={isCompact} />
  }, [isCompact])

  return (
    <Flex flex={1} width='full' justifyContent='center'>
      <Switch location={location}>
        <Route
          key={LimitOrderRoutePaths.Confirm}
          path={LimitOrderRoutePaths.Confirm}
          render={isNewLimitFlowEnabled ? renderLimitOrderShared : renderLimitOrderConfirm}
        />
        <Route
          key={LimitOrderRoutePaths.AllowanceApproval}
          path={LimitOrderRoutePaths.AllowanceApproval}
          render={renderAllowanceApproval}
        />
        <Route
          key={LimitOrderRoutePaths.PlaceOrder}
          path={LimitOrderRoutePaths.PlaceOrder}
          render={renderPlaceOrder}
        />
        <Route key={LimitOrderRoutePaths.Orders} path={LimitOrderRoutePaths.Orders}>
          <SlideTransitionRoute
            height={tradeInputRef.current?.offsetHeight ?? '500px'}
            width={tradeInputRef.current?.offsetWidth ?? 'full'}
            component={LimitOrderList}
            parentRoute={LimitOrderRoutePaths.Input}
          />
        </Route>
        <Route
          key={LimitOrderRoutePaths.Input}
          path={LimitOrderRoutePaths.Input}
          render={renderLimitOrderInput}
        />
      </Switch>
    </Flex>
  )
}
