import { Flex } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { Row } from '@tanstack/react-table'
import { matchSorter } from 'match-sorter'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Display } from 'components/Display'
import { PageBackButton, PageHeader } from 'components/Layout/Header/PageHeader'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { MarketsTableVirtualized } from 'components/MarketsTableVirtualized'
import { GlobalFilter } from 'components/StakingVaults/GlobalFilter'
import { RawText } from 'components/Text'
import { selectAssetsSortedByMarketCap } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const Assets = () => {
  const translate = useTranslate()
  const [searchQuery, setSearchQuery] = useState('')
  const history = useHistory()
  const assets = useAppSelector(selectAssetsSortedByMarketCap)
  const isSearching = useMemo(() => searchQuery.length > 0, [searchQuery])

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
    return isSearching ? filterRowsBySearchTerm(assets, searchQuery) : assets
  }, [assets, filterRowsBySearchTerm, isSearching, searchQuery])

  const handleRowClick = useCallback(
    (row: Row<Asset>) => {
      const { assetId } = row.original
      const url = assetId ? `/assets/${assetId}` : ''
      history.push(url)
    },
    [history],
  )
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
      <MarketsTableVirtualized rows={rows} onRowClick={handleRowClick} />
    </Main>
  )
}
