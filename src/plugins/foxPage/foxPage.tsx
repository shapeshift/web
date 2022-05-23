import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SimpleGrid,
  TabList,
  Tabs,
  useColorModeValue,
  useMediaQuery,
} from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

import { FoxTab } from './components/FoxTab'
import { Layout } from './components/Layout'
import { Total } from './components/Total'

export enum FoxPageRoutes {
  Fox = '/fox/fox',
  Foxy = '/fox/foxy',
}

export const FoxAssetId = 'eip155:1/erc20:0xc770eefad204b5180df6a14ee197d99d808ee52d'
export const FoxyAssetId = 'eip155:1/erc20:0xdc49108ce5c57bc3408c3a5e95f3d864ec386ed3'

export type FoxPageProps = {
  activeAssetId: AssetId
}

export const FoxPage = (props: FoxPageProps) => {
  const translate = useTranslate()
  const history = useHistory()
  const assetFox = useAppSelector(state => selectAssetById(state, FoxAssetId))
  const assetFoxy = useAppSelector(state => selectAssetById(state, FoxyAssetId))
  const isFoxSelected = props.activeAssetId === FoxAssetId
  const isFoxySelected = props.activeAssetId === FoxyAssetId
  const selectedAsset = isFoxSelected ? assetFox : assetFoxy
  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)
  const mobileTabBg = useColorModeValue('gray.100', 'gray.750')
  const { description } = assetFox || {}
  const query = useGetAssetDescriptionQuery(FoxAssetId)
  const isLoaded = !query.isLoading

  const handleFoxClick = () => {
    if (isFoxSelected) {
      return
    }

    history.push(FoxPageRoutes.Fox)
  }

  const handleFoxyClick = () => {
    if (isFoxySelected) {
      return
    }

    history.push(FoxPageRoutes.Foxy)
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
      <Tabs variant='unstyled' index={isFoxSelected ? 0 : 1}>
        <TabList>
          <SimpleGrid
            gridTemplateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
            gridGap={4}
            mb={4}
            width='full'
          >
            <Total fiatAmount={'6000'} icons={[assetFox.icon, assetFoxy.icon]} />
            {isLargerThanMd && (
              <>
                <FoxTab
                  assetSymbol={assetFox.symbol}
                  assetIcon={assetFox.icon}
                  isSelected={isFoxSelected}
                  cryptoAmount={'3000'}
                  fiatAmount={'1000'}
                  onClick={handleFoxClick}
                />
                <FoxTab
                  assetSymbol={assetFoxy.symbol}
                  assetIcon={assetFoxy.icon}
                  isSelected={isFoxySelected}
                  cryptoAmount={'3000'}
                  fiatAmount={'1000'}
                  onClick={handleFoxyClick}
                />
              </>
            )}
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
                    <FoxTab
                      assetSymbol={selectedAsset.symbol}
                      assetIcon={selectedAsset.icon}
                      cryptoAmount={'3000'}
                      fiatAmount={'1000'}
                      onClick={handleFoxClick}
                    />
                  </MenuButton>
                  <MenuList>
                    <MenuItem onClick={handleFoxClick}>
                      <FoxTab
                        assetSymbol={assetFox.symbol}
                        assetIcon={assetFox.icon}
                        isSelected={isFoxSelected}
                        cryptoAmount={'3000'}
                        fiatAmount={'1000'}
                        onClick={handleFoxClick}
                      />
                    </MenuItem>
                    <MenuItem onClick={handleFoxyClick}>
                      <FoxTab
                        assetSymbol={assetFoxy.symbol}
                        assetIcon={assetFoxy.icon}
                        isSelected={isFoxySelected}
                        cryptoAmount={'3000'}
                        fiatAmount={'1000'}
                      />
                    </MenuItem>
                  </MenuList>
                </Menu>
              </Box>
            )}
          </SimpleGrid>
        </TabList>
      </Tabs>
    </Layout>
  )
}
