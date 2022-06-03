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
import { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import {
  selectTotalCryptoBalanceWithDelegations,
  selectTotalFiatBalanceWithDelegations,
} from 'state/slices/portfolioSlice/selectors'
import { selectAssetById } from 'state/slices/selectors'
import { selectFirstAccountSpecifierByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { AssetActions } from './components/AssetActions'
import { FoxChart } from './components/FoxChart'
import { FoxTab } from './components/FoxTab'
import { Layout } from './components/Layout'
import { OtherOpportunities } from './components/OtherOpportunities/OtherOpportunities'
import { Total } from './components/Total'
import { TradeOpportunities, TradeOpportunitiesBucket } from './components/TradeOpportunities'
import {
  FoxAssetId,
  foxTradeOpportunitiesBuckets,
  FoxyAssetId,
  foxyTradeOpportunitiesBuckets,
} from './FoxCommon'
import { useOtherOpportunities } from './hooks/useOtherOpportunities'

export enum FoxPageRoutes {
  Fox = '/fox/fox',
  Foxy = '/fox/foxy',
}

const assetsRoutes: Record<AssetId, FoxPageRoutes> = {
  [FoxAssetId]: FoxPageRoutes.Fox,
  [FoxyAssetId]: FoxPageRoutes.Foxy,
}

const assetsTradeOpportunitiesBuckets: Record<AssetId, TradeOpportunitiesBucket[]> = {
  [FoxAssetId]: foxTradeOpportunitiesBuckets,
  [FoxyAssetId]: foxyTradeOpportunitiesBuckets,
}

export type FoxPageProps = {
  activeAssetId: AssetId
}

const FOX_DESCRIPTION =
  'Since 2019, our shapeshifting FOX Token has been offering users an ever-expanding world of utility and advantages. Today, our ERC-20 governance token not only enables you to influence the future of ShapeShift through your vote, you also have an ever-expanding universe of investing opportunities. Invest, track, and manage your FOX holdings here.'
export const FoxPage = (props: FoxPageProps) => {
  const translate = useTranslate()
  const history = useHistory()

  // TODO(gomes): Use useRouteAssetId and selectAssetById programatically
  const assetFox = useAppSelector(state => selectAssetById(state, FoxAssetId))
  const assetFoxy = useAppSelector(state => selectAssetById(state, FoxyAssetId))
  const otherOpportunities = useOtherOpportunities(props.activeAssetId)

  const assets = useMemo(() => [assetFox, assetFoxy], [assetFox, assetFoxy])

  const selectedAssetIndex = useMemo(
    () => assets.findIndex(asset => asset.assetId === props.activeAssetId),
    [props.activeAssetId, assets],
  )

  const selectedAsset = assets[selectedAssetIndex]

  const accountSpecifier = useAppSelector(state =>
    selectFirstAccountSpecifierByChainId(state, selectedAsset?.chainId),
  )

  const fiatBalanceFox = useAppSelector(state =>
    selectTotalFiatBalanceWithDelegations(state, { assetId: FoxAssetId, accountSpecifier }),
  )

  const fiatBalanceFoxy = useAppSelector(state =>
    selectTotalFiatBalanceWithDelegations(state, { assetId: FoxyAssetId, accountSpecifier }),
  )

  const cryptoBalanceFox = useAppSelector(state =>
    selectTotalCryptoBalanceWithDelegations(state, { assetId: FoxAssetId, accountSpecifier }),
  )

  const cryptoBalanceFoxy = useAppSelector(state =>
    selectTotalCryptoBalanceWithDelegations(state, { assetId: FoxyAssetId, accountSpecifier }),
  )

  const fiatBalances = useMemo(() => {
    return [fiatBalanceFox, fiatBalanceFoxy]
  }, [fiatBalanceFox, fiatBalanceFoxy])

  const cryptoBalances = useMemo(() => {
    return [cryptoBalanceFox, cryptoBalanceFoxy]
  }, [cryptoBalanceFox, cryptoBalanceFoxy])

  const totalFiatBalance = bnOrZero(fiatBalanceFox).plus(fiatBalanceFoxy).toString()

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const mobileTabBg = useColorModeValue('gray.100', 'gray.750')
  const description =
    selectedAsset?.assetId === FoxAssetId
      ? FOX_DESCRIPTION // FOX has a custom description, other assets can use the asset-service one
      : selectedAsset?.description
  const query = useGetAssetDescriptionQuery(FoxAssetId)
  const isLoaded = !query.isLoading

  const handleTabClick = (assetId: AssetId) => {
    if (assetId === props.activeAssetId) {
      return
    }

    history.push(assetsRoutes[assetId])
  }

  if (!isLoaded) return null

  return (
    <Layout
      title={translate('plugins.foxPage.foxToken', {
        assetSymbol: assetFox.symbol,
      })}
      description={description ? description : ''}
      icon={assetFox.icon}
    >
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
                  cryptoAmount={cryptoBalances[index]}
                  fiatAmount={fiatBalances[index]}
                  onClick={() => handleTabClick(asset.assetId)}
                />
              ))}
            {!isLargerThanMd && (
              <Box mb={4}>
                <Menu>
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
                        cryptoAmount={cryptoBalances[selectedAssetIndex]}
                        fiatAmount={fiatBalances[selectedAssetIndex]}
                      />
                    )}
                  </MenuButton>
                  <MenuList>
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
            <Stack
              alignItems='flex-start'
              spacing={4}
              mx='auto'
              direction={{ base: 'column', xl: 'row' }}
            >
              <Stack spacing={4} flex='1 1 0%' width='full'>
                <OtherOpportunities
                  description={'plugins.foxPage.otherOpportunitiesDescription'}
                  opportunities={otherOpportunities}
                />
              </Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', lg: 'sm' }} spacing={4}>
                <AssetActions assetId={FoxAssetId} />
                <FoxChart assetId={FoxAssetId} />
                <TradeOpportunities opportunities={assetsTradeOpportunitiesBuckets[FoxAssetId]} />
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
                  description={'plugins.foxPage.otherOpportunitiesDescription'}
                  opportunities={otherOpportunities}
                />
              </Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', lg: 'sm' }} spacing={4}>
                <AssetActions assetId={FoxyAssetId} />
                <FoxChart assetId={FoxyAssetId} />
                <TradeOpportunities opportunities={assetsTradeOpportunitiesBuckets[FoxyAssetId]} />
              </Stack>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Layout>
  )
}
