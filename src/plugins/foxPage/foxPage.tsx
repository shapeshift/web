import { ChevronDownIcon } from '@chakra-ui/icons'
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
import { SEO } from 'components/Layout/Seo'
import { WalletActions } from 'context/WalletProvider/actions'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useFoxyBalances } from 'pages/Defi/hooks/useFoxyBalances'
import { useGetFoxyAprQuery } from 'state/apis/foxy/foxyApi'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectAssetById,
  selectPortfolioCryptoHumanBalanceByFilter,
  selectPortfolioFiatBalanceByAssetId,
  selectSelectedLocale,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { AssetActions } from './components/AssetActions'
import { DappBack } from './components/DappBack'
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
  // TODO(gomes): Use useRouteAssetId and selectAssetById programmatically
  const assetFox = useAppSelector(state => selectAssetById(state, foxAssetId))
  const assetFoxy = useAppSelector(state => selectAssetById(state, foxyAssetId))
  if (!assetFox) throw new Error(`Asset not found for AssetId ${foxAssetId}`)
  if (!assetFoxy) throw new Error(`Asset not found for AssetId ${foxyAssetId}`)

  const { data: foxyBalancesData, isLoading: isFoxyBalancesLoading } = useFoxyBalances()
  const otherOpportunities = useOtherOpportunities(activeAssetId)

  const assets = useMemo(() => [assetFox, assetFoxy], [assetFox, assetFoxy])

  const selectedAssetIndex = useMemo(
    () => assets.findIndex(asset => asset?.assetId === activeAssetId),
    [activeAssetId, assets],
  )

  const selectedAsset = assets[selectedAssetIndex]

  const foxFilter = useMemo(() => ({ assetId: foxAssetId }), [])
  const foxyFilter = useMemo(() => ({ assetId: foxyAssetId }), [])
  const fiatBalanceFox =
    useAppSelector(s => selectPortfolioFiatBalanceByAssetId(s, foxFilter)) ?? '0'
  const fiatBalanceFoxy =
    useAppSelector(s => selectPortfolioFiatBalanceByAssetId(s, foxyFilter)) ?? '0'
  const cryptoHumanBalanceFox =
    useAppSelector(s => selectPortfolioCryptoHumanBalanceByFilter(s, foxFilter)) ?? '0'
  const cryptoHumanBalanceFoxy =
    useAppSelector(s => selectPortfolioCryptoHumanBalanceByFilter(s, foxyFilter)) ?? '0'

  const fiatBalances = useMemo(
    () => [fiatBalanceFox, fiatBalanceFoxy],
    [fiatBalanceFox, fiatBalanceFoxy],
  )

  const cryptoHumanBalances = useMemo(
    () => [cryptoHumanBalanceFox, cryptoHumanBalanceFoxy],
    [cryptoHumanBalanceFox, cryptoHumanBalanceFoxy],
  )

  const { data: foxyAprData, isLoading: isFoxyAprLoading } = useGetFoxyAprQuery()

  const totalFiatBalance = bnOrZero(fiatBalanceFox).plus(bnOrZero(fiatBalanceFoxy)).toString()

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
        assetNamespace: 'erc20',
        contractAddress: foxyAddresses[0].foxy,
        assetReference: foxyAddresses[0].staking,
        rewardId: foxyAddresses[0].foxy,
        modal: 'overview',
      }),
      state: { background: location },
    })
  }, [assetFoxy.chainId, dispatch, history, location, wallet])

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
      <SEO
        title={translate('plugins.foxPage.foxToken', {
          assetSymbol: selectedAsset.symbol,
        })}
      />
      <Tabs variant='unstyled' index={selectedAssetIndex}>
        <TabList>
          <SimpleGrid
            gridTemplateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
            gridGap={4}
            mb={4}
            width='full'
          >
            <Total fiatAmount={totalFiatBalance} icons={[assetFox.icon, assetFoxy.icon]} />
            {isLargerThanMd &&
              assets.map((asset, index) => (
                <FoxTab
                  key={asset.assetId}
                  assetSymbol={asset.symbol}
                  assetIcon={asset.icon}
                  cryptoAmount={cryptoHumanBalances[index]}
                  fiatAmount={fiatBalances[index]}
                  onClick={() => handleTabClick(asset.assetId)}
                />
              ))}
            {!isLargerThanMd && (
              <Box mb={4}>
                <Menu matchWidth>
                  <Box mx={{ base: 4, md: 0 }}>
                    <MenuButton
                      borderWidth='2px'
                      borderColor='primary'
                      height='auto'
                      as={Button}
                      rightIcon={<ChevronDownIcon />}
                      bg={mobileTabBg}
                      width='full'
                    >
                      {selectedAsset && (
                        <FoxTab
                          assetSymbol={selectedAsset.symbol}
                          assetIcon={selectedAsset.icon}
                          cryptoAmount={cryptoHumanBalances[selectedAssetIndex]}
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
                          cryptoAmount={cryptoHumanBalances[index]}
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
            <Stack
              alignItems='flex-start'
              spacing={4}
              mx='auto'
              direction={{ base: 'column', xl: 'row' }}
            >
              <Stack spacing={4} flex='1 1 0%' width='full'>
                <MainOpportunity
                  assetId={selectedAsset.assetId}
                  apy={foxyAprData?.foxyApr ?? ''}
                  tvl={bnOrZero(foxyBalancesData?.opportunities?.[0]?.tvl).toString()}
                  isLoaded={!isFoxyBalancesLoading && !isFoxyAprLoading}
                  balance={cryptoHumanBalances[selectedAssetIndex]}
                  onClick={handleOpportunityClick}
                />

                <OtherOpportunities
                  title={`plugins.foxPage.otherOpportunitiesTitle.${selectedAsset.symbol}`}
                  description={`plugins.foxPage.otherOpportunitiesDescription.${selectedAsset.symbol}`}
                  opportunities={otherOpportunities}
                />
                <Governance />
              </Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', lg: 'sm' }} spacing={4}>
                <AssetActions assetId={foxAssetId} />
                <DappBack />
                <TradeOpportunities opportunities={assetsTradeOpportunitiesBuckets[foxAssetId]} />
                <AssetMarketData assetId={selectedAsset.assetId} />
                <FoxChart assetId={foxAssetId} />
              </Stack>
            </Stack>
          </TabPanel>
          <TabPanel p={0}>
            <Stack
              alignItems='flex-start'
              spacing={4}
              mx='auto'
              direction={{ base: 'column', xl: 'row' }}
            >
              <Stack spacing={4} flex='1 1 0%' width='full'>
                <OtherOpportunities
                  title={`plugins.foxPage.otherOpportunitiesTitle.${selectedAsset.symbol}`}
                  description={`plugins.foxPage.otherOpportunitiesDescription.${selectedAsset.symbol}`}
                  opportunities={otherOpportunities}
                />
              </Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', lg: 'sm' }} spacing={4}>
                <AssetActions assetId={foxyAssetId} />
                <DappBack />
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
