import { Box } from '@chakra-ui/react'
import type { AccountId } from '@shapeshiftoss/caip'
import { ethChainId } from '@shapeshiftoss/caip'
import {
  supportsBTC,
  supportsCosmos,
  supportsETH,
  supportsEthSwitchChain,
} from '@shapeshiftoss/hdwallet-core'
import { KnownChainIds } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
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
import type { ChainIdType } from 'state/slices/portfolioSlice/utils'
import { isAssetSupportedByWallet } from 'state/slices/portfolioSlice/utils'
import type { Nullable } from 'types/common'

import type { FiatRamp } from '../config'
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
  // TODO: once MultiAccounts feature flag was removed, we can get rid of this
  // whole addresses, since AccountDropdown will manage this part
  // We keep addresses in manager so we don't have to on every <Overview /> mount
  const [btcAddress, setBtcAddress] = useState<string>('')
  const [bchAddress, setBchAddress] = useState<string>('')
  const [dogeAddress, setDogeAddress] = useState<string>('')
  const [ltcAddress, setLtcAddress] = useState<string>('')
  const [ethAddress, setEthAddress] = useState<string | undefined>()
  const [avalancheAddress, setAvalancheAddress] = useState<string>('')
  const [cosmosAddress, setCosmosAddress] = useState<string>('')
  const [supportsAddressVerifying, setSupportsAddressVerifying] = useState<boolean>(false)
  const [ensName, setEnsName] = useState<string>('')

  const chainAdapterManager = getChainAdapterManager()
  const ethereumChainAdapter = chainAdapterManager.get(KnownChainIds.EthereumMainnet)
  const avalancheChainAdapter = chainAdapterManager.get(KnownChainIds.AvalancheMainnet)
  const bitcoinChainAdapter = chainAdapterManager.get(KnownChainIds.BitcoinMainnet)
  const bitcoinCashChainAdapter = chainAdapterManager.get(KnownChainIds.BitcoinCashMainnet)
  const dogecoinChainAdapter = chainAdapterManager.get(KnownChainIds.DogecoinMainnet)
  const litecoinChainAdapter = chainAdapterManager.get(KnownChainIds.LitecoinMainnet)
  const cosmosChainAdapter = chainAdapterManager.get(KnownChainIds.CosmosMainnet)

  const [chainId, setChainId] = useState<ChainIdType>(ethChainId)

  const {
    state: { wallet },
  } = useWallet()
  const [accountId, setAccountId] = useState<Nullable<AccountId>>(null)

  useEffect(() => {
    ;(async () => {
      if (!wallet) return
      moduleLogger.trace({ fn: 'getAddress' }, 'Getting Addresses...')
      const payload = { wallet }
      try {
        if (supportsETH(wallet) && ethereumChainAdapter) {
          setEthAddress(await ethereumChainAdapter.getAddress(payload))
        }
        if (supportsEthSwitchChain(wallet) && avalancheChainAdapter) {
          setAvalancheAddress(await avalancheChainAdapter.getAddress(payload))
        }
        if (supportsBTC(wallet) && bitcoinChainAdapter) {
          setBtcAddress(await bitcoinChainAdapter.getAddress(payload))
        }
        if (supportsBTC(wallet) && bitcoinCashChainAdapter) {
          setBchAddress(await bitcoinCashChainAdapter.getAddress(payload))
        }
        if (supportsBTC(wallet) && dogecoinChainAdapter) {
          setDogeAddress(await dogecoinChainAdapter.getAddress(payload))
        }
        if (supportsBTC(wallet) && litecoinChainAdapter) {
          setLtcAddress(await litecoinChainAdapter.getAddress(payload))
        }
        if (supportsCosmos(wallet) && cosmosChainAdapter) {
          setCosmosAddress(await cosmosChainAdapter.getAddress(payload))
        }
      } catch (e) {
        moduleLogger.error(e, { fn: 'getAddress' }, 'GetAddress Failed')
      }
    })()
  }, [
    wallet,
    bitcoinChainAdapter,
    bitcoinCashChainAdapter,
    dogecoinChainAdapter,
    litecoinChainAdapter,
    ethereumChainAdapter,
    avalancheChainAdapter,
    cosmosChainAdapter,
  ])

  const { data: ensNameResponse, isSuccess: isEnsNameLoaded } = useEnsName({
    address: ethAddress,
    cacheTime: Infinity, // Cache a given ENS reverse resolution response infinitely for the lifetime of a tab / until app reload
    staleTime: Infinity, // Cache a given ENS reverse resolution query infinitely for the lifetime of a tab / until app reload
  })

  useEffect(() => {
    ;(async () => {
      if (ensName || !(isEnsNameLoaded && ensNameResponse)) return
      setEnsName(ensNameResponse)
    })()
  }, [ensName, ensNameResponse, ethAddress, isEnsNameLoaded])

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
            bchAddress={bchAddress}
            dogeAddress={dogeAddress}
            ltcAddress={ltcAddress}
            cosmosAddress={cosmosAddress}
            ethAddress={ethAddress ?? ''}
            avalancheAddress={avalancheAddress}
            supportsAddressVerifying={supportsAddressVerifying}
            setSupportsAddressVerifying={setSupportsAddressVerifying}
            chainAdapterManager={chainAdapterManager}
            chainId={chainId}
            setChainId={setChainId}
            fiatRampProvider={fiatRampProvider}
            ensName={ensName}
            handleAccountIdChange={setAccountId}
            accountId={accountId}
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
        <Box p={4}>
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
