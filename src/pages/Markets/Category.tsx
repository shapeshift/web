import { Box } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useParams } from 'react-router-dom'

import { MarketsRow } from './components/MarketsRow'
import type { MarketsCategories } from './constants'
import { sortOptionsByCategory } from './constants'
import { useRows } from './hooks/useRows'
import { MarketsHeader } from './MarketsHeader'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'

const containerPaddingX = { base: 4, xl: 0 }

const ASSETS_LIMIT = 100

export const Category: React.FC = () => {
  const params = useParams<{ category: MarketsCategories }>()
  const category = params.category as MarketsCategories
  const translate = useTranslate()
  const headerComponent = useMemo(() => <MarketsHeader />, [])

  const allRows = useRows({ limit: ASSETS_LIMIT })
  const row = allRows[category]

  const shouldShowSortFilter = useMemo(() => {
    if (!sortOptionsByCategory[category]) return false

    return true
  }, [category])

  const body = useMemo(
    () => (
      <MarketsRow
        title={row.title}
        subtitle={row.subtitle}
        supportedChainIds={row.supportedChainIds}
        category={row.category}
        showOrderFilter
        showSortFilter={shouldShowSortFilter}
      >
        {row.component}
      </MarketsRow>
    ),
    [
      row.category,
      row.component,
      row.subtitle,
      row.supportedChainIds,
      row.title,
      shouldShowSortFilter,
    ],
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
