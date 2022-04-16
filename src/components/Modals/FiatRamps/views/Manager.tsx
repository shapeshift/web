import { Box } from '@chakra-ui/react'
import { supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { matchPath, MemoryRouter, Redirect, Route, RouteComponentProps, Switch } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'hooks/useWallet/useWallet'
import { ensReverseLookup } from 'lib/ens'

import { FiatRamp } from '../config'
import { FiatRampAction, FiatRampCurrencyBase } from '../FiatRampsCommon'
import { AssetSelect } from './AssetSelect'
import { Overview } from './Overview'

enum FiatRampManagerRoutes {
  Buy = '/buy',
  Sell = '/sell',
  BuySelect = '/buy/select',
  SellSelect = '/sell/select',
}

type RouterLocationState = {
  walletSupportsBTC: boolean
  selectAssetTranslation: string
}

const entries = [
  FiatRampManagerRoutes.Buy,
  FiatRampManagerRoutes.BuySelect,
  FiatRampManagerRoutes.Sell,
  FiatRampManagerRoutes.SellSelect,
]

const ManagerRouter = (props: { fiatRampProvider: FiatRamp } & RouteComponentProps) => {
  const { location, history } = props

  const [selectedAsset, setSelectedAsset] = useState<FiatRampCurrencyBase | null>(null)
  const [isBTC, setIsBTC] = useState<boolean | null>(null)
  // We keep addresses in manager so we don't have to on every <Overview /> mount
  const [btcAddress, setBtcAddress] = useState<string | null>(null)
  const [ethAddress, setEthAddress] = useState<string | null>(null)
  const [supportsAddressVerifying, setSupportsAddressVerifying] = useState<boolean | null>(null)
  const [ensName, setEnsName] = useState<string | null>()

  const chainAdapterManager = useChainAdapters()
  const ethereumChainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const bitcoinChainAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)

  const [chainType, setChainType] = useState<ChainTypes.Bitcoin | ChainTypes.Ethereum>(
    ChainTypes.Ethereum,
  )
  const chainAdapter = chainAdapterManager.byChain(chainType)

  const {
    state: { wallet },
  } = useWallet()

  useEffect(() => {
    ;(async () => {
      if (!wallet) return
      const ethAddress = await ethereumChainAdapter.getAddress({
        wallet,
      })
      setEthAddress(ethAddress)
      if (supportsBTC(wallet)) {
        const btcAddress = await bitcoinChainAdapter.getAddress({
          wallet,
        })
        setBtcAddress(btcAddress)
      }
    })()
  }, [wallet, bitcoinChainAdapter, ethereumChainAdapter])

  useEffect(() => {
    ;(async () => {
      if (ethAddress && !ensName) {
        const reverseEthAddressLookup = await ensReverseLookup(ethAddress)
        if (reverseEthAddressLookup?.name) setEnsName(reverseEthAddressLookup.name)
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

  const handleAssetSelect = (asset: FiatRampCurrencyBase, isBTC: boolean) => {
    const route =
      match?.params.fiatRampAction === FiatRampAction.Buy
        ? FiatRampManagerRoutes.Buy
        : FiatRampManagerRoutes.Sell
    setSelectedAsset(asset)
    setIsBTC(isBTC)
    history.push(route)
  }

  const handleIsSelectingAsset = (walletSupportsBTC: Boolean, selectAssetTranslation: string) => {
    const route =
      match?.params.fiatRampAction === FiatRampAction.Buy
        ? FiatRampManagerRoutes.BuySelect
        : FiatRampManagerRoutes.SellSelect
    history.push(route, { walletSupportsBTC, selectAssetTranslation })
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
            chainAdapter={chainAdapter}
            setChainType={setChainType}
            isBTC={isBTC}
            fiatRampProvider={props.fiatRampProvider}
            ensName={null}
          />
        </Route>
        {props.fiatRampProvider && (
          <Route exact path='/:fiatRampAction/select'>
            <AssetSelect
              walletSupportsBTC={
                (location.state as RouterLocationState)?.walletSupportsBTC ?? false
              }
              selectAssetTranslation={
                (location.state as RouterLocationState)?.selectAssetTranslation ?? ''
              }
              onAssetSelect={handleAssetSelect}
              fiatRampProvider={props.fiatRampProvider}
            />
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
