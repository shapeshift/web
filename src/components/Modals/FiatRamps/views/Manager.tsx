import type { AccountId, ChainId } from '@shapeshiftoss/caip'
import { ethChainId, fromAccountId } from '@shapeshiftoss/caip'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
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
import { useEnsName } from 'wagmi'
import { SlideTransition } from 'components/SlideTransition'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useWallet } from 'hooks/useWallet/useWallet'
import { logger } from 'lib/logger'
import { selectPortfolioAccountMetadata } from 'state/slices/portfolioSlice/selectors'
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

export type AddressByAccountId = Record<AccountId, string>

const ManagerRouter: React.FC<RouteComponentProps> = () => {
  const history = useHistory()
  const location = useLocation<RouterLocationState>()

  const portfolioAccountMetadata = useSelector(selectPortfolioAccountMetadata)
  const [selectedAsset, setSelectedAsset] = useState<FiatRampAsset | null>(null)

  const [addressByAccountId, setAddressByAccountId] = useState<AddressByAccountId>({})

  const [supportsAddressVerifying, setSupportsAddressVerifying] = useState<boolean>(false)
  const [ensName, setEnsName] = useState<string>('')
  const [chainId, setChainId] = useState<ChainId>(ethChainId)

  const {
    state: { wallet },
  } = useWallet()
  const [accountId, setAccountId] = useState<Nullable<AccountId>>(null)

  useEffect(() => {
    ;(async () => {
      if (!accountId) return
      if (!wallet) return
      const { accountType, bip44Params } = portfolioAccountMetadata[accountId]
      moduleLogger.trace({ fn: 'getAddress' }, 'Getting Addresses...')
      const payload = { accountType, bip44Params, wallet }
      const { chainId } = fromAccountId(accountId)
      const address = await getChainAdapterManager().get(chainId)!.getAddress(payload)
      setAddressByAccountId({ ...addressByAccountId, [accountId]: address })
    })()
    // addressByAccountId is set by this effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, portfolioAccountMetadata, selectedAsset, wallet])

  const { data: ensNameResponse, isSuccess: isEnsNameLoaded } = useEnsName({
    address: addressByAccountId[''],
    cacheTime: Infinity, // Cache a given ENS reverse resolution response infinitely for the lifetime of a tab / until app reload
    staleTime: Infinity, // Cache a given ENS reverse resolution query infinitely for the lifetime of a tab / until app reload
  })

  useEffect(() => {
    ;(async () => {
      if (ensName || !(isEnsNameLoaded && ensNameResponse)) return
      setEnsName(ensNameResponse)
    })()
  }, [ensName, ensNameResponse, isEnsNameLoaded])

  const match = matchPath<{ fiatRampAction: FiatRampAction }>(location.pathname, {
    path: '/:fiatRampAction',
  })

  const handleFiatRampActionClick = (fiatRampAction: FiatRampAction) => {
    const route =
      fiatRampAction === FiatRampAction.Buy ? FiatRampManagerRoutes.Buy : FiatRampManagerRoutes.Sell
    setSelectedAsset(null)
    history.push(route)
  }

  const onAssetSelect = (asset: FiatRampAsset | null) => {
    if (!wallet) return
    const route =
      match?.params.fiatRampAction === FiatRampAction.Buy
        ? FiatRampManagerRoutes.Buy
        : FiatRampManagerRoutes.Sell
    setSelectedAsset(asset)
    history.push(route)
  }

  const handleIsSelectingAsset = (asset: FiatRampAsset | null, selectAssetTranslation: string) => {
    if (!wallet) return
    const walletSupportsAsset = isAssetSupportedByWallet(asset?.assetId ?? '', wallet)
    const route =
      match?.params.fiatRampAction === FiatRampAction.Buy
        ? FiatRampManagerRoutes.BuySelect
        : FiatRampManagerRoutes.SellSelect
    history.push(route, { walletSupportsAsset, selectAssetTranslation })
  }

  const { selectAssetTranslation } = location.state ?? {}

  const assetSelectProps = {
    selectAssetTranslation,
    onAssetSelect,
  }

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route exact path='/:fiatRampAction'>
          <Overview
            selectedAsset={selectedAsset}
            onIsSelectingAsset={handleIsSelectingAsset}
            onFiatRampActionClick={handleFiatRampActionClick}
            addressByAccountId={addressByAccountId}
            supportsAddressVerifying={supportsAddressVerifying}
            setSupportsAddressVerifying={setSupportsAddressVerifying}
            chainId={chainId}
            setChainId={setChainId}
            ensName={ensName}
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
