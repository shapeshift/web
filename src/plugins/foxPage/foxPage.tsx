import { SimpleGrid, Stack, TabList, Tabs } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { useGetAssetDescriptionQuery } from 'state/slices/assetsSlice/assetsSlice'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetActions } from './components/AssetActions'
import { FoxTab } from './components/FoxTab'
import { Layout } from './components/Layout'
import { Total } from './components/Total'
import { FoxAssetId, FoxyAssetId } from './constants'

export enum FoxPageRoutes {
  Fox = '/fox/fox',
  Foxy = '/fox/foxy',
}

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

        <Stack
          alignItems='flex-start'
          spacing={4}
          mx='auto'
          direction={{ base: 'column', xl: 'row' }}
        >
          <Stack spacing={4} flex='1 1 0%' width='full'></Stack>
          <Stack flex='1 1 0%' width='full' maxWidth={{ base: 'full', xl: 'sm' }} spacing={4}>
            <AssetActions assetId={props.activeAssetId} onReceiveClick={() => null} />
          </Stack>
        </Stack>
      </Tabs>
    </Layout>
  )
}
