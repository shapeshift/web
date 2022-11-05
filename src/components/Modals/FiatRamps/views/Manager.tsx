import type { AccountId } from '@keepkey/caip'
import { fromAccountId } from '@keepkey/caip'
import { AnimatePresence } from 'framer-motion'
import isEmpty from 'lodash/isEmpty'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
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
import type { ParseAddressInputReturn } from 'lib/address/address'
import { parseAddressInput } from 'lib/address/address'
import { logger } from 'lib/logger'
import {
  selectPortfolioAccountIds,
  selectPortfolioAccountMetadata,
} from 'state/slices/portfolioSlice/selectors'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
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

export type AddressesByAccountId = Record<AccountId, Partial<ParseAddressInputReturn>>

const ManagerRouter: React.FC<RouteComponentProps> = () => {
  const history = useHistory()
  const location = useLocation<RouterLocationState>()

  const portfolioAccountIds = useSelector(selectPortfolioAccountIds)
  const portfolioAccountMetadata = useSelector(selectPortfolioAccountMetadata)
  const [selectedAsset, setSelectedAsset] = useState<FiatRampAsset | null>(null)
  const [accountId, setAccountId] = useState<Nullable<AccountId>>(null)
  const [addressByAccountId, setAddressByAccountId] = useState<AddressesByAccountId>({})

  const {
    state: { wallet },
  } = useWallet()

  /**
   * preload all addresses, and reverse resolved vanity addresses for all account ids
   */
  useEffect(() => {
    if (!wallet) return
    ;(async () => {
      const plainAddressResults = await Promise.allSettled(
        portfolioAccountIds.map(accountId => {
          const accountMetadata = portfolioAccountMetadata[accountId]
          const { accountType, bip44Params } = accountMetadata
          moduleLogger.trace({ fn: 'getAddress' }, 'Getting Addresses...')
          const payload = { accountType, bip44Params, wallet }
          const { chainId } = fromAccountId(accountId)
          const maybeAdapter = getChainAdapterManager().get(chainId)
          if (!maybeAdapter) return Promise.resolve(`no chain adapter for ${chainId}`)
          return maybeAdapter.getAddress(payload)
        }),
      )
      const plainAddresses = plainAddressResults.reduce<(string | undefined)[]>((acc, result) => {
        if (result.status === 'rejected') {
          moduleLogger.error(result.reason, 'failed to get address')
          acc.push(undefined) // keep same length of accumulator
          return acc
        }
        acc.push(result.value)
        return acc
      }, [])

      const parsedAddressResults = await Promise.allSettled(
        plainAddresses.map((value, idx) => {
          if (!value) return Promise.resolve({ address: '', vanityAddress: '' })
          const { chainId } = fromAccountId(portfolioAccountIds[idx])
          return parseAddressInput({ chainId, value })
        }),
      )

      const addressesByAccountId = parsedAddressResults.reduce<AddressesByAccountId>(
        (acc, parsedAddressResult, idx) => {
          if (parsedAddressResult.status === 'rejected') return acc
          const accountId = portfolioAccountIds[idx]
          const { value } = parsedAddressResult
          acc[accountId] = value
          return acc
        },
        {},
      )

      setAddressByAccountId(addressesByAccountId)
    })()
  }, [portfolioAccountIds, portfolioAccountMetadata, wallet])

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

  const { address, vanityAddress } = useMemo(() => {
    const empty = { address: '', vanityAddress: '' }
    if (isEmpty(addressByAccountId)) return empty
    if (!accountId) return empty
    const address = addressByAccountId[accountId]?.address ?? ''
    const vanityAddress = addressByAccountId[accountId]?.vanityAddress ?? ''
    return { address, vanityAddress }
  }, [addressByAccountId, accountId])

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route exact path='/:fiatRampAction'>
          <Overview
            selectedAsset={selectedAsset}
            onIsSelectingAsset={handleIsSelectingAsset}
            onFiatRampActionClick={handleFiatRampActionClick}
            address={address}
            vanityAddress={vanityAddress}
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
