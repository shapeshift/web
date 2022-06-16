import { Box } from '@chakra-ui/react'
import { ethChainId } from '@shapeshiftoss/caip'
import { supportsBTC, supportsCosmos, supportsETH } from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
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
import { ensReverseLookup } from 'lib/address/ens'
import { logger } from 'lib/logger'
import { ChainIdType, isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'

import { FiatRamp } from '../config'
import { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'
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

const moduleLogger = logger.child({
  namespace: ['Modals', 'FiatRamps', 'Views', 'Manager'],
})

const ManagerRouter: React.FC<ManagerRouterProps> = ({ fiatRampProvider }) => {
  const history = useHistory()
  const location = useLocation<RouterLocationState>()

  const [selectedAsset, setSelectedAsset] = useState<FiatRampAsset | null>(null)
  // We keep addresses in manager so we don't have to on every <Overview /> mount
  const [btcAddress, setBtcAddress] = useState<string>('')
  const [ethAddress, setEthAddress] = useState<string>('')
  const [cosmosAddress, setCosmosAddress] = useState<string>('')
  const [supportsAddressVerifying, setSupportsAddressVerifying] = useState<boolean>(false)
  const [ensName, setEnsName] = useState<string>('')

  const chainAdapterManager = useChainAdapters()
  const ethereumChainAdapter = chainAdapterManager.get(KnownChainIds.EthereumMainnet)
  const bitcoinChainAdapter = chainAdapterManager.get(KnownChainIds.BitcoinMainnet)
  const cosmosChainAdapter = chainAdapterManager.get(KnownChainIds.CosmosMainnet)

  const [chainId, setChainId] = useState<ChainIdType>(ethChainId)

  const {
    state: { wallet },
  } = useWallet()

  useEffect(() => {
    ;(async () => {
      if (!wallet) return
      moduleLogger.trace({ fn: 'getAddress' }, 'Getting Addresses...')
      const payload = { wallet }
      try {
        if (supportsETH(wallet) && ethereumChainAdapter) {
          setEthAddress(await ethereumChainAdapter.getAddress(payload))
        }
        if (supportsBTC(wallet) && bitcoinChainAdapter) {
          setBtcAddress(await bitcoinChainAdapter.getAddress(payload))
        }
        if (supportsCosmos(wallet) && cosmosChainAdapter) {
          setCosmosAddress(await cosmosChainAdapter.getAddress(payload))
        }
      } catch (e) {
        moduleLogger.error(e, { fn: 'getAddress' }, 'GetAddress Failed')
      }
    })()
  }, [wallet, bitcoinChainAdapter, ethereumChainAdapter, cosmosChainAdapter])

  useEffect(() => {
    ;(async () => {
      moduleLogger.trace({ fn: 'ensReverseLookup' }, 'ENS Reverse Lookup...')
      try {
        !ensName && setEnsName((await ensReverseLookup(ethAddress)).name ?? '')
      } catch (e) {
        moduleLogger.error(e, { fn: 'ensReverseLookup' }, 'ENS Reverse Lookup Failed')
      }
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
            cosmosAddress={cosmosAddress}
            ethAddress={ethAddress}
            supportsAddressVerifying={supportsAddressVerifying}
            setSupportsAddressVerifying={setSupportsAddressVerifying}
            chainAdapterManager={chainAdapterManager}
            chainId={chainId}
            setChainId={setChainId}
            fiatRampProvider={fiatRampProvider}
            ensName={ensName}
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
