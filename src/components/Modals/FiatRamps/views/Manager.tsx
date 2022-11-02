import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { ethAssetId } from '@shapeshiftoss/caip'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import { AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
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
import { useWallet } from 'hooks/useWallet/useWallet'
import type { ParseAddressInputReturn } from 'lib/address/address'

import { FiatRampAction } from '../FiatRampsCommon'
import { AssetSelect } from './AssetSelect'
import { FiatForm } from './FiatForm'

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

export type AddressesByAccountId = Record<AccountId, Partial<ParseAddressInputReturn>>

type ManagerRouterProps = {
  defaultAssetId?: AssetId
  defaultFiatRampAction?: FiatRampAction
}

const ManagerRouter: React.FC<ManagerRouterProps & RouteComponentProps> = ({
  defaultFiatRampAction = FiatRampAction.Buy,
  defaultAssetId = ethAssetId,
}) => {
  const history = useHistory()
  const translate = useTranslate()
  const location = useLocation<RouterLocationState>()

  const [selectedAssetId, setSelectedAssetId] = useState<AssetId>(defaultAssetId)

  const {
    state: { wallet },
  } = useWallet()

  const match = useMemo(
    () =>
      matchPath<{ fiatRampAction: FiatRampAction }>(location.pathname, {
        path: '/:fiatRampAction',
      }),
    [location.pathname],
  )

  const handleAssetSelect = useCallback(
    (assetId: AssetId) => {
      const route =
        match?.params.fiatRampAction === FiatRampAction.Buy
          ? FiatRampManagerRoutes.Buy
          : FiatRampManagerRoutes.Sell
      setSelectedAssetId(assetId)
      history.push(route)
    },
    [history, match?.params.fiatRampAction],
  )

  const handleIsSelectingAsset = useCallback(
    (fiatRampAction: FiatRampAction) => {
      if (!wallet) return
      const route =
        fiatRampAction === FiatRampAction.Buy
          ? FiatRampManagerRoutes.BuySelect
          : FiatRampManagerRoutes.SellSelect
      history.push(route)
    },
    [history, wallet],
  )

  const assetSelectProps = useMemo(
    () => ({
      selectAssetTranslation: location.state?.selectAssetTranslation,
      handleAssetSelect,
    }),
    [location.state, handleAssetSelect],
  )

  useEffect(() => {
    if (defaultFiatRampAction) {
      history.push(defaultFiatRampAction)
    }
  }, [defaultFiatRampAction, history])

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route exact path='/buy'>
          <DefiModalHeader title={translate('fiatRamps.title')} />
          <FiatForm
            handleIsSelectingAsset={handleIsSelectingAsset}
            assetId={selectedAssetId}
            fiatRampAction={FiatRampAction.Buy}
          />
        </Route>
        <Route exact path='/sell'>
          <DefiModalHeader title={translate('fiatRamps.title')} />
          <FiatForm
            handleIsSelectingAsset={handleIsSelectingAsset}
            assetId={selectedAssetId}
            fiatRampAction={FiatRampAction.Sell}
          />
        </Route>
        <Route exact path='/buy/select'>
          <AssetSelect {...assetSelectProps} fiatRampAction={FiatRampAction.Buy} />
        </Route>
        <Route exact path='/sell/select'>
          <AssetSelect {...assetSelectProps} fiatRampAction={FiatRampAction.Sell} />
        </Route>
        <Redirect path='/' to={FiatRampAction.Buy} />
      </Switch>
    </AnimatePresence>
  )
}

export const FiatManager: React.FC<ManagerRouterProps> = ({
  defaultFiatRampAction,
  defaultAssetId,
}) => {
  return (
    <SlideTransition>
      <MemoryRouter initialEntries={entries}>
        <Switch>
          <Route
            path='/'
            component={(props: RouteComponentProps) => (
              <ManagerRouter
                defaultFiatRampAction={defaultFiatRampAction}
                defaultAssetId={defaultAssetId}
                {...props}
              />
            )}
          />
        </Switch>
      </MemoryRouter>
    </SlideTransition>
  )
}
