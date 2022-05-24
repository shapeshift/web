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
import { AssetMarketData } from 'components/AssetHeader/AssetMarketData'
import { useFoxyMarketData } from 'hooks/useFoxyMarketData/useFoxyMarketData'
import { useRouteAssetId } from 'hooks/useRouteAssetId/useRouteAssetId'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { FoxChart } from './components/FoxChart'
import { FoxTab } from './components/FoxTab'
import { Layout } from './components/Layout'
import { Total } from './components/Total'

export enum FoxPageRoutes {
  Fox = '/fox/fox',
  Foxy = '/fox/foxy',
}

export const FoxAssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
export const FoxyAssetId = 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3'

const assetsRoutes: Record<AssetId, FoxPageRoutes> = {
  [FoxAssetId]: FoxPageRoutes.Fox,
  [FoxyAssetId]: FoxPageRoutes.Foxy,
}

export const FoxPage: React.FC<{}> = () => {
  const translate = useTranslate()
  const history = useHistory()
  const assetFox = useAppSelector(state => selectAssetById(state, FoxAssetId))
  const assetFoxy = useAppSelector(state => selectAssetById(state, FoxyAssetId))

  const assets = useMemo(() => [assetFox, assetFoxy], [assetFox, assetFoxy])

  const activeAssetId = useRouteAssetId()
  const selectedAssetIndex = useMemo(
    () => assets.findIndex(asset => asset.assetId === activeAssetId),
    [activeAssetId, assets],
  )

  const selectedAsset = assets[selectedAssetIndex]
  const foxyMarketData = useFoxyMarketData()
  const foxyMaxTotalSupply = foxyMarketData.maxTotalSupply

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const mobileTabBg = useColorModeValue('gray.100', 'gray.750')
  const { description } = assetFox || {}
  const query = useGetAssetDescriptionQuery(FoxAssetId)
  const isLoaded = !query.isLoading

  const handleTabClick = (assetId: AssetId) => {
    if (assetId === activeAssetId) {
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
            <Total fiatAmount={'6000'} icons={[assetFox.icon, assetFoxy.icon]} />
            {isLargerThanMd &&
              assets.map(asset => (
                <FoxTab
                  assetSymbol={asset.symbol}
                  assetIcon={asset.icon}
                  isSelected={activeAssetId === asset.assetId}
                  cryptoAmount={'3000'}
                  fiatAmount={'1000'}
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
                        cryptoAmount={'3000'}
                        fiatAmount={'1000'}
                      />
                    )}
                  </MenuButton>
                  <MenuList>
                    {assets.map(asset => (
                      <MenuItem onClick={() => handleTabClick(asset.assetId)}>
                        <FoxTab
                          assetSymbol={asset.symbol}
                          assetIcon={asset.icon}
                          isSelected={asset.assetId === activeAssetId}
                          cryptoAmount={'3000'}
                          fiatAmount={'1000'}
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
            <Stack alignItems='flex-end' spacing={4} mx='auto' direction={{ base: 'column' }}>
              <Stack spacing={4} flex='1 1 0%' width='full'></Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', lg: 'sm' }} spacing={4}>
                <FoxChart assetId={FoxAssetId} />
              </Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', lg: 'sm' }} spacing={4}>
                <AssetMarketData assetId={FoxAssetId} />
              </Stack>
            </Stack>
          </TabPanel>
          <TabPanel p={0}>
            <Stack alignItems='flex-end' spacing={4} mx='auto' direction={{ base: 'column' }}>
              <Stack spacing={4} flex='1 1 0%' width='full'></Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', lg: 'sm' }} spacing={4}>
                <FoxChart assetId={FoxyAssetId} />
              </Stack>
              <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', lg: 'sm' }} spacing={4}>
                <AssetMarketData assetId={FoxyAssetId} fallbackMaxSupply={foxyMaxTotalSupply} />
              </Stack>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Layout>
  )
}
