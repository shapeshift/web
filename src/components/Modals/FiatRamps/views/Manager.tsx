import type { AccountId } from '@shapeshiftoss/caip'
import { fromAccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { RouteComponentProps } from 'react-router'
import {
  matchPath,
  MemoryRouter,
  Redirect,
  Route,
  Switch,
  useHistory,
  useLocation,
} from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { selectPortfolioAccountMetadataByAccountId } from 'state/slices/portfolioSlice/selectors'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import { useAppSelector } from 'state/store'
import type { Nullable } from 'types/common'

import type { FiatRampAsset } from '../FiatRampsCommon'
import { FiatRampAction } from '../FiatRampsCommon'
import { AssetSelect } from './AssetSelect'
import { Overview } from './Overview'

enum FiatRampManagerRoutes {
  Buy = '/buy',
  Sell = '/sell',
  BuySelect = '/buy/select',
  SellSelect = '/sell/select',
}

type RouterLocationState = {
  walletSupportsAsset: boolean
  selectAssetTranslation: string
}

const entries = [
  FiatRampManagerRoutes.Buy,
  FiatRampManagerRoutes.BuySelect,
  FiatRampManagerRoutes.Sell,
  FiatRampManagerRoutes.SellSelect,
]

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'Views', 'Manager'],
})

export type AddressByAccountId = Record<AccountId, string>

const ManagerRouter: React.FC<RouteComponentProps> = () => {
  const history = useHistory()
  const location = useLocation<RouterLocationState>()

  const [selectedAsset, setSelectedAsset] = useState<FiatRampAsset | null>(null)
  const [accountId, setAccountId] = useState<Nullable<AccountId>>(null)
  const filter = useMemo(
    () => ({ assetId: selectedAsset?.assetId ?? '', accountId: accountId ?? '' }),
    [selectedAsset, accountId],
  )
  const accountMetadata = useAppSelector(s => selectPortfolioAccountMetadataByAccountId(s, filter))
  const [addressByAccountId, setAddressByAccountId] = useState<AddressByAccountId>({})

  const {
    state: { wallet },
  } = useWallet()

  useEffect(() => {
    ;(async () => {
      if (!accountId) return
      if (!wallet) return
      const { accountType, bip44Params } = accountMetadata
      moduleLogger.trace({ fn: 'getAddress' }, 'Getting Addresses...')
      const payload = { accountType, bip44Params, wallet }
      const { chainId } = fromAccountId(accountId)
      const address = await getChainAdapterManager().get(chainId)!.getAddress(payload)
      setAddressByAccountId({ ...addressByAccountId, [accountId]: address })
    })()
    // addressByAccountId is set by this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, accountMetadata, wallet])

  const match = useMemo(
    () =>
      matchPath<{ fiatRampAction: FiatRampAction }>(location.pathname, {
        path: '/:fiatRampAction',
      }),
    [location.pathname],
  )

  const handleFiatRampActionClick = useCallback(
    (fiatRampAction: FiatRampAction) => {
      const route =
        fiatRampAction === FiatRampAction.Buy
          ? FiatRampManagerRoutes.Buy
          : FiatRampManagerRoutes.Sell
      setSelectedAsset(null)
      history.push(route)
    },
    [history],
  )

  const onAssetSelect = useCallback(
    (asset: FiatRampAsset | null) => {
      if (!wallet) return
      const route =
        match?.params.fiatRampAction === FiatRampAction.Buy
          ? FiatRampManagerRoutes.Buy
          : FiatRampManagerRoutes.Sell
      setSelectedAsset(asset)
      history.push(route)
    },
    [history, match?.params.fiatRampAction, wallet],
  )

  const handleIsSelectingAsset = useCallback(
    (asset: FiatRampAsset | null, selectAssetTranslation: string) => {
      if (!wallet) return
      const walletSupportsAsset = isAssetSupportedByWallet(asset?.assetId ?? '', wallet)
      const route =
        match?.params.fiatRampAction === FiatRampAction.Buy
          ? FiatRampManagerRoutes.BuySelect
          : FiatRampManagerRoutes.SellSelect
      history.push(route, { walletSupportsAsset, selectAssetTranslation })
    },
    [history, match?.params.fiatRampAction, wallet],
  )

  const assetSelectProps = useMemo(
    () => ({
      selectAssetTranslation: location.state?.selectAssetTranslation,
      onAssetSelect,
    }),
    [location.state, onAssetSelect],
  )

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route exact path='/:fiatRampAction'>
          <Overview
            selectedAsset={selectedAsset}
            onIsSelectingAsset={handleIsSelectingAsset}
            onFiatRampActionClick={handleFiatRampActionClick}
            addressByAccountId={addressByAccountId}
            handleAccountIdChange={setAccountId}
            accountId={accountId}
          />
        </Route>
        <Route exact path='/:fiatRampAction/select'>
          <AssetSelect {...assetSelectProps} />
        </Route>
        <Redirect from='/' to={FiatRampManagerRoutes.Buy} />
      </Switch>
    </AnimatePresence>
  )
}

export const Manager = () => {
  return (
    <SlideTransition>
      <MemoryRouter initialEntries={entries}>
        <Switch>
          <Route
            path='/'
            component={(props: RouteComponentProps) => <ManagerRouter {...props} />}
          />
        </Switch>
      </MemoryRouter>
    </SlideTransition>
  )
}
