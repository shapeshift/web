import { Flex } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { Row } from '@tanstack/react-table'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { AssetActionsDrawer } from '@/components/AssetHeader/AssetActionsDrawer'
import { Display } from '@/components/Display'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { MarketsTableVirtualized } from '@/components/MarketTableVirtualized/MarketsTableVirtualized'
import { GlobalFilter } from '@/components/StakingVaults/GlobalFilter'
import { RawText } from '@/components/Text'
import { selectAssetsNoSpam } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const Assets = () => {
  const translate = useTranslate()
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const assetsNoSpam = useAppSelector(selectAssetsNoSpam)
  const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])
  const [selectedAssetIdForMenu, setSelectedAssetIdForMenu] = useState<string | undefined>()

  const filterRowsBySearchTerm = useCallback((rows: Asset[], filterValue: any) => {
    if (!filterValue) return rows
    if (typeof filterValue !== 'string') {
      return []
    }
    const search = filterValue.trim().toLowerCase()
    const matchedAssets = matchSorter(rows, search, {
      keys: ['name', 'symbol'],
      threshold: matchSorter.rankings.CONTAINS,
    })
    return matchedAssets
  }, [])
  const rows = useMemo(() => {
    return isSearching ? filterRowsBySearchTerm(assetsNoSpam, searchQuery) : assetsNoSpam
  }, [assetsNoSpam, filterRowsBySearchTerm, isSearching, searchQuery])

  const handleRowClick = useCallback(
    (row: Row<Asset>) => {
      const { assetId } = row.original
      const url = assetId ? `/assets/${assetId}` : ''
      navigate(url)
    },
    [navigate],
  )

  const handleRowLongPress = useCallback((row: Row<Asset>) => {
    const { assetId } = row.original
    setSelectedAssetIdForMenu(assetId)
  }, [])

  const handleCloseAssetMenu = useCallback(() => setSelectedAssetIdForMenu(undefined), [])

  return (
    <Main display='flex' flexDir='column' minHeight='calc(100vh - 72px)' isSubPage>
      <SEO title={translate('navBar.assets')} />
      <Display.Mobile>
        <PageHeader>
          <PageHeader.Left>
            <PageBackButton />
          </PageHeader.Left>
          <PageHeader.Middle>
            <RawText textAlign='center'>{translate('navBar.assets')}</RawText>
          </PageHeader.Middle>
          <Flex gridColumn='1 / span 3' order='4' mt={2}>
            <GlobalFilter searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          </Flex>
        </PageHeader>
      </Display.Mobile>
      <MarketsTableVirtualized
        rows={rows}
        onRowClick={handleRowClick}
        onRowLongPress={handleRowLongPress}
      />
      <AssetActionsDrawer
        assetId={selectedAssetIdForMenu}
        isOpen={selectedAssetIdForMenu !== undefined}
        onClose={handleCloseAssetMenu}
      />
    </Main>
  )
}
