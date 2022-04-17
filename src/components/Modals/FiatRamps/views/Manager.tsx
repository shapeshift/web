import { Box } from '@chakra-ui/react'
import { supportsBTC, supportsETH } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  matchPath,
  MemoryRouter,
  Redirect,
  Route,
  RouteComponentProps,
  Switch,
  useHistory,
  useLocation,
} from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { ensReverseLookup } from 'lib/ens'
import { ChainId, ethChainId } from 'state/slices/portfolioSlice/utils'

import { FiatRamp } from '../config'
import { FiatRampAction, FiatRampCurrencyBase } from '../FiatRampsCommon'
import { isSupportedAsset } from '../utils'
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

type ManagerRouterProps = {
  fiatRampProvider: FiatRamp
}

const ManagerRouter: React.FC<ManagerRouterProps> = ({ fiatRampProvider }) => {
  const history = useHistory()
  const location = useLocation<RouterLocationState>()

  const [selectedAsset, setSelectedAsset] = useState<FiatRampCurrencyBase | null>(null)
  const [walletSupportsAsset, setWalletSupportsAsset] = useState<boolean>(false)
  // We keep addresses in manager so we don't have to on every <Overview /> mount
  const [btcAddress, setBtcAddress] = useState<string>('')
  const [ethAddress, setEthAddress] = useState<string>('')
  const [supportsAddressVerifying, setSupportsAddressVerifying] = useState<boolean>(false)
  const [ensName, setEnsName] = useState<string>('')

  const chainAdapterManager = useChainAdapters()
  const ethereumChainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const bitcoinChainAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)

  const [chainId, setChainId] = useState<ChainId>(ethChainId)

  const {
    state: { wallet },
  } = useWallet()

  useEffect(() => {
    ;(async () => {
      if (!wallet) return
      const payload = { wallet }
      supportsETH(wallet) && setEthAddress(await ethereumChainAdapter.getAddress(payload))
      supportsBTC(wallet) && setBtcAddress(await bitcoinChainAdapter.getAddress(payload))
    })()
  }, [wallet, bitcoinChainAdapter, ethereumChainAdapter])

  useEffect(() => {
    ;(async () => {
      ethAddress && !ensName && setEnsName((await ensReverseLookup(ethAddress))?.name ?? '')
    })()
  }, [ensName, ethAddress])

  const match = matchPath<{ fiatRampAction: FiatRampAction }>(location.pathname, {
    path: '/:fiatRampAction',
  })

  const handleFiatRampActionClick = (fiatRampAction: FiatRampAction) => {
    const route =
      fiatRampAction === FiatRampAction.Buy ? FiatRampManagerRoutes.Buy : FiatRampManagerRoutes.Sell
    setSelectedAsset(null)
    history.push(route)
  }

  const onAssetSelect = (asset: FiatRampCurrencyBase | null) => {
    if (!wallet) return
    const route =
      match?.params.fiatRampAction === FiatRampAction.Buy
        ? FiatRampManagerRoutes.Buy
        : FiatRampManagerRoutes.Sell
    setSelectedAsset(asset)
    setWalletSupportsAsset(isSupportedAsset(asset?.assetId ?? '', wallet))
    history.push(route)
  }

  const handleIsSelectingAsset = (
    asset: FiatRampCurrencyBase | null,
    selectAssetTranslation: string,
  ) => {
    if (!wallet) return
    const walletSupportsAsset = isSupportedAsset(asset?.assetId ?? '', wallet)
    const route =
      match?.params.fiatRampAction === FiatRampAction.Buy
        ? FiatRampManagerRoutes.BuySelect
        : FiatRampManagerRoutes.SellSelect
    history.push(route, { walletSupportsAsset, selectAssetTranslation })
  }

  const { selectAssetTranslation } = location.state ?? {}

  const assetSelectProps = {
    walletSupportsAsset,
    selectAssetTranslation,
    onAssetSelect,
    fiatRampProvider,
  }

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route exact path='/:fiatRampAction'>
          <Overview
            selectedAsset={selectedAsset}
            onIsSelectingAsset={handleIsSelectingAsset}
            onFiatRampActionClick={handleFiatRampActionClick}
            btcAddress={btcAddress}
            ethAddress={ethAddress}
            supportsAddressVerifying={supportsAddressVerifying}
            setSupportsAddressVerifying={setSupportsAddressVerifying}
            chainAdapterManager={chainAdapterManager}
            chainId={chainId}
            setChainId={setChainId}
            fiatRampProvider={fiatRampProvider}
            ensName={''}
          />
        </Route>
        {fiatRampProvider && (
          <Route exact path='/:fiatRampAction/select'>
            <AssetSelect {...assetSelectProps} />
          </Route>
        )}
        <Redirect from='/' to={FiatRampManagerRoutes.Buy} />
      </Switch>
    </AnimatePresence>
  )
}

export const Manager = ({ fiatRampProvider }: { fiatRampProvider: FiatRamp }) => {
  return (
    <SlideTransition>
      <MemoryRouter initialEntries={entries}>
        <Box m={4} width={'24rem'}>
          <Switch>
            <Route
              path='/'
              component={(props: RouteComponentProps) => (
                <ManagerRouter fiatRampProvider={fiatRampProvider} {...props} />
              )}
            />
          </Switch>
        </Box>
      </MemoryRouter>
    </SlideTransition>
  )
}
