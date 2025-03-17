import { usePrevious } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter, Route, Switch, useHistory, useLocation } from 'react-router-dom'

import { LimitOrderRoutePaths } from '@/components/MultiHopTrade/components/LimitOrder/types'
import { ClaimRoutePaths } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/types'
import type { TradeCardProps } from '@/components/MultiHopTrade/MultiHopTrade'
import { MultiHopTrade } from '@/components/MultiHopTrade/MultiHopTrade'
import { TradeInputTab, TradeRoutePaths } from '@/components/MultiHopTrade/types'
import { selectAssetById } from '@/state/slices/assetsSlice/selectors'
import { selectInputBuyAsset, selectInputSellAsset } from '@/state/slices/tradeInputSlice/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { useAppDispatch, useAppSelector } from '@/state/store'

type StandaloneTradeProps = Omit<TradeCardProps, 'onChangeTab'>

// i.e all the routes that Trade.tsx handles
const initialEntries = [
  TradeRoutePaths.Input,
  TradeRoutePaths.Confirm,
  TradeRoutePaths.VerifyAddresses,
  TradeRoutePaths.QuoteList,
  TradeRoutePaths.Quotes,
]

// A standalone version of the trade page routing as an HOC, without it being a page, and without leveraging top-level routes but rather
// wrapping trade routes with a MemoryRouter.
// This allows us to keep the logic the same as usual and don't add any more refactor to https://github.com/shapeshift/web/pull/8983
// We should prefer regular routing whenever possible or at least use `MemoryRouter`s with caution, but for the time being, this is a pragmatic solution
// to allow us to have our cake and eat it
export const StandaloneTrade: React.FC<StandaloneTradeProps> = props => {
  return (
    <MemoryRouter initialEntries={initialEntries} initialIndex={0}>
      <StandaloneTradeInner {...props} />
    </MemoryRouter>
  )
}

// Inner version to get access to the MemoryRouter's context, another day in react world
const StandaloneTradeInner: React.FC<StandaloneTradeProps> = props => {
  const history = useHistory()
  const location = useLocation()
  const methods = useForm({ mode: 'onChange' })
  const dispatch = useAppDispatch()

  const inputSellAsset = useAppSelector(selectInputSellAsset)
  const inputBuyAsset = useAppSelector(selectInputBuyAsset)

  const isInitialMount = useRef(true)
  const prevDefaultBuyAssetId = usePrevious(props.defaultBuyAssetId)
  const prevDefaultSellAssetId = usePrevious(props.defaultSellAssetId)
  const defaultBuyAsset = useAppSelector(state =>
    selectAssetById(state, props.defaultBuyAssetId ?? ''),
  )
  const defaultSellAsset = useAppSelector(state =>
    selectAssetById(state, props.defaultSellAssetId ?? ''),
  )

  const updateDefaultAssetsPair = useCallback(() => {
    dispatch(tradeInput.actions.clear())

    if (defaultBuyAsset) {
      dispatch(tradeInput.actions.setBuyAsset(defaultBuyAsset))
    }

    if (defaultSellAsset) {
      dispatch(tradeInput.actions.setSellAsset(defaultSellAsset))
    }
  }, [dispatch, defaultBuyAsset, defaultSellAsset])

  useEffect(() => {
    // Only run me on the initial mount of a *specific* instance i.e standalone or trade page
    if (isInitialMount.current) {
      isInitialMount.current = false

      // Check if we're coming from another page (not a mini swapper page, as there is no unmount then)
      // We do so by checking if the current assets are matching (or not) the default assets
      // Which it won't if we're going from /trade to an asset page, and vice versa
      const shouldResetState =
        !props.defaultBuyAssetId ||
        inputBuyAsset.assetId !== props.defaultBuyAssetId ||
        inputSellAsset.assetId !== props.defaultSellAssetId

      if (shouldResetState) {
        updateDefaultAssetsPair()
      }

      return
    }

    // Ensure that navigating between two asset pages does update the assets
    if (
      props.defaultBuyAssetId !== prevDefaultBuyAssetId ||
      props.defaultSellAssetId !== prevDefaultSellAssetId
    ) {
      updateDefaultAssetsPair()
    }
  }, [
    props.defaultBuyAssetId,
    props.defaultSellAssetId,
    prevDefaultBuyAssetId,
    prevDefaultSellAssetId,
    inputBuyAsset.assetId,
    inputSellAsset.assetId,
    updateDefaultAssetsPair,
  ])

  const handleChangeTab = useCallback(
    (newTab: TradeInputTab) => {
      switch (newTab) {
        case TradeInputTab.Trade:
          history.push(TradeRoutePaths.Input)
          break
        case TradeInputTab.LimitOrder:
          history.push(LimitOrderRoutePaths.Input)
          break
        case TradeInputTab.Claim:
          history.push(ClaimRoutePaths.Select)
          break
        default:
          break
      }
    },
    [history],
  )

  return (
    <FormProvider {...methods}>
      <Switch location={location}>
        <Route key={TradeRoutePaths.Input} path={TradeRoutePaths.Input}>
          <MultiHopTrade {...props} onChangeTab={handleChangeTab} isStandalone />
        </Route>
      </Switch>
    </FormProvider>
  )
}
