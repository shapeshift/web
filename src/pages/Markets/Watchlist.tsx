import { Box } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { AssetsGrid } from './components/AssetsGrid'
import { MarketsRow } from './components/MarketsRow'
import type { RowProps } from './hooks/useRows'
import { MarketsHeader } from './MarketsHeader'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import { useAppSelector } from '@/state/store'

const containerPaddingX = { base: 4, xl: 0 }

export const WatchList: React.FC = () => {
  const translate = useTranslate()
  const headerComponent = useMemo(() => <MarketsHeader />, [])

  const watchedAssetIds = useAppSelector(preferences.selectors.selectWatchedAssetIds)

  const component = useCallback(
    ({ selectedChainId, showSparkline }: RowProps) => (
      <AssetsGrid
        assetIds={watchedAssetIds}
        selectedChainId={selectedChainId}
        isLoading={false}
        limit={undefined}
        showSparkline={showSparkline}
      />
    ),
    [watchedAssetIds],
  )

  const body = useMemo(
    () => (
      <MarketsRow title={translate('markets.watchlist')} supportedChainIds={undefined}>
        {component}
      </MarketsRow>
    ),
    [component, translate],
  )

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={translate('navBar.markets')} />
      <Box py={4} px={containerPaddingX}>
        {body}
      </Box>
    </Main>
  )
}
