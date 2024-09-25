import { Box } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { selectWatchedAssetIds } from 'state/slices/preferencesSlice/selectors'
import { useAppSelector } from 'state/store'

import { AssetsGrid } from './components/AssetsGrid'
import { MarketsRow } from './components/MarketsRow'
import type { RowProps } from './hooks/useRows'
import { MarketsHeader } from './MarketsHeader'

const containerPaddingX = { base: 4, xl: 0 }

export const WatchList: React.FC = () => {
  const translate = useTranslate()
  const headerComponent = useMemo(() => <MarketsHeader />, [])

  const watchedAssetIds = useAppSelector(selectWatchedAssetIds)

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
