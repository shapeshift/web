import { Box } from '@chakra-ui/react'
import { supportsBTC } from '@shapeshiftoss/hdwallet-core'
import { ChainTypes } from '@shapeshiftoss/types'
import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { matchPath, MemoryRouter, Redirect, Route, Switch } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { useChainAdapters } from 'context/PluginProvider/PluginProvider'
import { useWallet } from 'context/WalletProvider/WalletProvider'
import { ensReverseLookup } from 'lib/ens'

import { FiatRampAction, GemCurrency } from '../FiatRamps'
import { AssetSelect } from './AssetSelect'
import { GemOverview } from './GemOverview'

export enum GemManagerRoutes {
  Buy = '/buy',
  Sell = '/sell',
  BuySelect = '/buy/select',
  SellSelect = '/sell/select'
}
const entries = [
  GemManagerRoutes.Buy,
  GemManagerRoutes.BuySelect,
  GemManagerRoutes.Sell,
  GemManagerRoutes.SellSelect
]

const GemManagerRouter = (props: any) => {
  const { location, history } = props

  const [selectedAsset, setSelectedAsset] = useState<GemCurrency | null>(null)
  const [isBTC, setIsBTC] = useState<boolean | null>(null)
  // We addresses in manager so we don't have to on every <GemOverview /> mount
  const [btcAddress, setBtcAddress] = useState<string | null>(null)
  const [ethAddress, setEthAddress] = useState<string | null>(null)
  const [supportsAddressVerifying, setSupportsAddressVerifying] = useState<boolean | null>(null)
  const [ensName, setEnsName] = useState<string | null>()

  const chainAdapterManager = useChainAdapters()
  const ethereumChainAdapter = chainAdapterManager.byChain(ChainTypes.Ethereum)
  const bitcoinChainAdapter = chainAdapterManager.byChain(ChainTypes.Bitcoin)

  const [chainType, setChainType] = useState<ChainTypes.Bitcoin | ChainTypes.Ethereum>(
    ChainTypes.Ethereum
  )
  const chainAdapter = chainAdapterManager.byChain(chainType)

  const {
    state: { wallet }
  } = useWallet()

  useEffect(() => {
    ;(async () => {
      if (!wallet) return
      const ethAddress = await ethereumChainAdapter.getAddress({
        wallet
      })
      setEthAddress(ethAddress)
      if (supportsBTC(wallet)) {
        const btcAddress = await bitcoinChainAdapter.getAddress({
          wallet
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
    path: '/:fiatRampAction'
  })
  const handleFiatRampActionClick = (fiatRampAction: FiatRampAction) => {
    const route =
      fiatRampAction === FiatRampAction.Buy ? GemManagerRoutes.Buy : GemManagerRoutes.Sell
    setSelectedAsset(null)
    history.push(route)
  }
  const handleAssetSelect = (asset: GemCurrency, isBTC: boolean) => {
    const route =
      match?.params.fiatRampAction === FiatRampAction.Buy
        ? GemManagerRoutes.Buy
        : GemManagerRoutes.Sell
    setSelectedAsset(asset)
    setIsBTC(isBTC)
    history.push(route)
  }
  const handleIsSelectingAsset = (walletSupportsBTC: Boolean, selectAssetTranslation: string) => {
    const route =
      match?.params.fiatRampAction === FiatRampAction.Buy
        ? GemManagerRoutes.BuySelect
        : GemManagerRoutes.SellSelect
    history.push(route, { walletSupportsBTC, selectAssetTranslation })
  }

  return (
    <AnimatePresence exitBeforeEnter initial={false}>
      <Switch location={location} key={location.key}>
        <Route exact path='/:fiatRampAction'>
          <GemOverview
            {...props}
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
          />
        </Route>
        <Route exact path='/:fiatRampAction/select'>
          <AssetSelect {...location.state} onAssetSelect={handleAssetSelect} />
        </Route>
        <Redirect from='/' to={GemManagerRoutes.Buy} />
      </Switch>
    </AnimatePresence>
  )
}

export const GemManager = () => {
  return (
    <SlideTransition>
      <MemoryRouter initialEntries={entries}>
        <Box m={4} width={'24rem'}>
          <Switch>
            <Route path='/' component={GemManagerRouter} />
          </Switch>
        </Box>
      </MemoryRouter>
    </SlideTransition>
  )
}
