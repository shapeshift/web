import { SimpleGrid, TabList, Tabs } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

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
  const foxTabSelected = props.activeAssetId === FoxAssetId
  const foxyTabSelected = props.activeAssetId === FoxyAssetId
  const { description } = assetFox || {}
  const query = useGetAssetDescriptionQuery(FoxAssetId)
  const isLoaded = !query.isLoading

  const handleClickFoxTab = () => {
    if (foxTabSelected) {
      return
    }
    history.push(FoxPageRoutes.Fox)
  }

  const handleClickFoxyTab = () => {
    if (foxyTabSelected) {
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
      <Tabs variant='unstyled' px={20}>
        <TabList>
          <SimpleGrid
            gridTemplateColumns={{ base: 'repeat(1, 1fr)', lg: 'repeat(3, 1fr)' }}
            gridGap={4}
            mb={4}
            width='full'
          >
            <Total fiatAmount={'6000'} icons={[assetFox.icon, assetFoxy.icon]} />
            <FoxTab
              assetSymbol={assetFox.symbol}
              assetIcon={assetFox.icon}
              isSelected={foxTabSelected}
              cryptoAmount={'3000'}
              fiatAmount={'1000'}
              onClick={handleClickFoxTab}
            />
            <FoxTab
              assetSymbol={assetFoxy.symbol}
              assetIcon={assetFoxy.icon}
              isSelected={foxyTabSelected}
              cryptoAmount={'3000'}
              fiatAmount={'1000'}
              onClick={handleClickFoxyTab}
            />
          </SimpleGrid>
        </TabList>
      </Tabs>
    </Layout>
  )
}
