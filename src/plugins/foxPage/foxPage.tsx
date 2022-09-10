import { ChevronDownIcon } from '@chakra-ui/icons'
import type { StackDirection } from '@chakra-ui/react'
import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SimpleGrid,
  Stack,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { foxAssetId, foxyAssetId } from '@shapeshiftoss/caip'
import { supportsETH } from '@shapeshiftoss/hdwallet-core'
import { foxyAddresses } from '@shapeshiftoss/investor-foxy'
import { DefiProvider } from 'features/defi/contexts/DefiManagerProvider/DefiCommon'
import qs from 'qs'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useLocation } from 'react-router'
import { AssetMarketData } from 'components/AssetHeader/AssetMarketData'
import { WalletActions } from 'context/WalletProvider/actions'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { useGetFoxyAprQuery } from 'state/apis/foxy/foxyApi'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectTotalCryptoBalanceWithDelegations,
  selectTotalFiatBalanceWithDelegations,
} from 'state/slices/portfolioSlice/selectors'
import {
  selectAssetById,
  selectFirstAccountSpecifierByChainId,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { AssetActions } from './components/AssetActions'
import { FoxChart } from './components/FoxChart'
import { FoxTab } from './components/FoxTab'
import { Governance } from './components/Governance'
import { Layout } from './components/Layout'
import { MainOpportunity } from './components/MainOpportunity'
import { OtherOpportunities } from './components/OtherOpportunities/OtherOpportunities'
import { Total } from './components/Total'
import type { TradeOpportunitiesBucket } from './components/TradeOpportunities'
import { TradeOpportunities } from './components/TradeOpportunities'
import { foxTradeOpportunitiesBuckets, foxyTradeOpportunitiesBuckets } from './FoxCommon'
import { useOtherOpportunities } from './hooks/useOtherOpportunities'

export enum FoxPageRoutes {
  Fox = '/fox/fox',
  Foxy = '/fox/foxy',
}

const assetsRoutes: Record<AssetId, FoxPageRoutes> = {
  [foxAssetId]: FoxPageRoutes.Fox,
  [foxyAssetId]: FoxPageRoutes.Foxy,
}

const assetsTradeOpportunitiesBuckets: Record<AssetId, TradeOpportunitiesBucket[]> = {
  [foxAssetId]: foxTradeOpportunitiesBuckets,
  [foxyAssetId]: foxyTradeOpportunitiesBuckets,
}

export const FoxPage = () => {
  const {
    state: { wallet },
    dispatch,
  } = useWallet()
  const translate = useTranslate()
  const history = useHistory()
  const location = useLocation()

  const activeAssetId = useRouteAssetId()
  // TODO(gomes): Use useRouteAssetId and selectAssetById programatically
  const assetFox = useAppSelector(state => selectAssetById(state, foxAssetId))
  const assetFoxy = useAppSelector(state => selectAssetById(state, foxyAssetId))
  const { data: foxyBalancesData, isLoading: isFoxyBalancesLoading } = useFoxyBalances({
    accountNumber: 0,
  })
  const otherOpportunities = useOtherOpportunities(activeAssetId)

  const assets = useMemo(() => [assetFox, assetFoxy], [assetFox, assetFoxy])

  const selectedAssetIndex = useMemo(
    () => assets.findIndex(asset => asset.assetId === activeAssetId),
    [activeAssetId, assets],
  )

  const selectedAsset = assets[selectedAssetIndex]

  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, selectedAsset?.chainId),
  )

  const fiatBalanceFox = useAppSelector(state =>
    selectTotalFiatBalanceWithDelegations(state, { assetId: foxAssetId, accountSpecifier }),
  )

  const fiatBalanceFoxy = useAppSelector(state =>
    selectTotalFiatBalanceWithDelegations(state, { assetId: foxyAssetId, accountSpecifier }),
  )

  const cryptoBalanceFox = useAppSelector(state =>
    selectTotalCryptoBalanceWithDelegations(state, { assetId: foxAssetId, accountSpecifier }),
  )

  const cryptoBalanceFoxy = useAppSelector(state =>
    selectTotalCryptoBalanceWithDelegations(state, { assetId: foxyAssetId, accountSpecifier }),
  )

  const fiatBalances = useMemo(() => {
    return [fiatBalanceFox, fiatBalanceFoxy]
  }, [fiatBalanceFox, fiatBalanceFoxy])

  const cryptoBalances = useMemo(
    () => [cryptoBalanceFox, cryptoBalanceFoxy],
    [cryptoBalanceFox, cryptoBalanceFoxy],
  )

  const { data: foxyAprData, isLoading: isFoxyAprLoading } = useGetFoxyAprQuery()

  const totalFiatBalance = bnOrZero(fiatBalanceFox).plus(fiatBalanceFoxy).toString()

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  const mobileTabBg = useColorModeValue('gray.100', 'gray.750')
  const description =
    selectedAsset?.assetId === foxAssetId
      ? translate('plugins.foxPage.foxDescription') // FOX has a custom description, other assets can use the asset-service one
      : selectedAsset?.description

  const selectedLocale = useAppSelector(selectSelectedLocale)
  // TODO(gomes): Export a similar RTK select() query, consumed to determine wallet + staking balance loaded
  const getAssetDescriptionQuery = useGetAssetDescriptionQuery({
    assetId: selectedAsset?.assetId,
    selectedLocale,
  })
  const isAssetDescriptionLoaded = !getAssetDescriptionQuery.isLoading

  const handleTabClick = useCallback(
    (assetId: AssetId) => {
      if (assetId === activeAssetId) {
        return
      }

      history.push(assetsRoutes[assetId])
    },
    [activeAssetId, history],
  )

  const handleOpportunityClick = useCallback(() => {
    if (!wallet || !supportsETH(wallet)) {
      dispatch({ type: WalletActions.SET_WALLET_MODAL, payload: true })
      return
    }

    history.push({
      pathname: location.pathname,
      search: qs.stringify({
        provider: DefiProvider.ShapeShift,
        chainId: assetFoxy.chainId,
        contractAddress: foxyAddresses[0].staking,
        assetReference: foxyAddresses[0].fox,
        rewardId: foxyAddresses[0].foxy,
        modal: 'overview',
      }),
      state: { background: location },
    })
  }, [assetFoxy.chainId, dispatch, history, location, wallet])


  const stackMaxWidth = useMemo(() => ({ base: 'full', lg: 'sm' }), [])
  const stackDirection: StackDirection = useMemo(() => ({ base: 'column', xl: 'row' }), [])
  const gridTemplateColumns = useMemo(() => ({ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }), [])
  const totalIcons = useMemo(() => [assetFox.icon, assetFoxy.icon], [assetFox.icon, assetFoxy.icon])
  const foxMenuRowMx = useMemo(() => ({ base: 4, md: 0 }), [])
  const chevronDownIcon = useMemo(() => <ChevronDownIcon />, [])

  if (!isAssetDescriptionLoaded || !activeAssetId) return null
  if (wallet && supportsETH(wallet) && (isFoxyBalancesLoading || !foxyBalancesData)) return null

  return (
    <Layout
      title={translate('plugins.foxPage.foxToken', {
        assetSymbol: selectedAsset.symbol,
      })}
      description={description ?? ''}
      icon={selectedAsset.icon}
    >
      <Tabs variant='unstyled' index={selectedAssetIndex}>
        <TabList>
          <SimpleGrid gridTemplateColumns={gridTemplateColumns} gridGap={4} mb={4} width='full'>
            <Total fiatAmount={totalFiatBalance} icons={totalIcons} />
            {isLargerThanMd &&
              assets.map((asset, index) => (
                <FoxTab
                  key={asset.assetId}
                  assetSymbol={asset.symbol}
                  assetIcon={asset.icon}
                  cryptoAmount={cryptoBalances[index]}
                  fiatAmount={fiatBalances[index]}
                  onClick={() => handleTabClick(asset.assetId)}
                />
              ))}
            {!isLargerThanMd && (
              <Box mb={4}>
                <Menu matchWidth>
                  <Box mx={foxMenuRowMx}>
                    <MenuButton
                      borderWidth='2px'
                      borderColor='primary'
                      height='auto'
                      as={Button}
                      rightIcon={chevronDownIcon}
                      bg={mobileTabBg}
                      width='full'
                    >
                      {selectedAsset && (
                        <FoxTab
                          assetSymbol={selectedAsset.symbol}
                          assetIcon={selectedAsset.icon}
                          cryptoAmount={cryptoBalances[selectedAssetIndex]}
                          fiatAmount={fiatBalances[selectedAssetIndex]}
                        />
                      )}
                    </MenuButton>
                  </Box>
                  <MenuList zIndex={3}>
                    {assets.map((asset, index) => (
                      <MenuItem key={asset.assetId} onClick={() => handleTabClick(asset.assetId)}>
                        <FoxTab
                          assetSymbol={asset.symbol}
                          assetIcon={asset.icon}
                          cryptoAmount={cryptoBalances[index]}
                          fiatAmount={fiatBalances[index]}
                          as={Box}
                        />
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              </Box>
            )}
          </SimpleGrid>
        </TabList>
        <TabPanels>
          <TabPanel p={0}>
            <Stack alignItems='flex-start' spacing={4} mx='auto' direction={stackDirection}>
              <Stack spacing={4} flex='1 1 0%' width='full'>
                <MainOpportunity
                  assetId={selectedAsset.assetId}
                  apy={foxyAprData?.foxyApr ?? ''}
                  tvl={bnOrZero(foxyBalancesData?.opportunities?.[0]?.tvl).toString()}
                  isLoaded={!isFoxyBalancesLoading && !isFoxyAprLoading}
                  balance={cryptoBalances[selectedAssetIndex]}
                  onClick={handleOpportunityClick}
                />

                <OtherOpportunities
                  title={`plugins.foxPage.otherOpportunitiesTitle.${selectedAsset.symbol}`}
                  description={`plugins.foxPage.otherOpportunitiesDescription.${selectedAsset.symbol}`}
                  opportunities={otherOpportunities}
                />
                <Governance />
              </Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={stackMaxWidth} spacing={4}>
                <AssetActions assetId={foxAssetId} />
                <TradeOpportunities opportunities={assetsTradeOpportunitiesBuckets[foxAssetId]} />
                <AssetMarketData assetId={selectedAsset.assetId} />
                <FoxChart assetId={foxAssetId} />
              </Stack>
            </Stack>
          </TabPanel>
          <TabPanel p={0}>
            <Stack alignItems='flex-start' spacing={4} mx='auto' direction={stackDirection}>
              <Stack spacing={4} flex='1 1 0%' width='full'>
                <OtherOpportunities
                  title={`plugins.foxPage.otherOpportunitiesTitle.${selectedAsset.symbol}`}
                  description={`plugins.foxPage.otherOpportunitiesDescription.${selectedAsset.symbol}`}
                  opportunities={otherOpportunities}
                />
              </Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={stackMaxWidth} spacing={4}>
                <AssetActions assetId={foxyAssetId} />
                <TradeOpportunities opportunities={assetsTradeOpportunitiesBuckets[foxyAssetId]} />
                <AssetMarketData assetId={selectedAsset.assetId} />
                <FoxChart assetId={foxyAssetId} />
              </Stack>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Layout>
  )
}
