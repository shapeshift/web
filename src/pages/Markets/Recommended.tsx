import { Box } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'

import { MarketsRow } from './components/MarketsRow'
import { useRows } from './hooks/useRows'
import { MarketsHeader } from './MarketsHeader'

import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'

const ASSETS_LIMIT = 8

export const Recommended: React.FC = () => {
  'use no memo'
  const translate = useTranslate()
  const headerComponent = useMemo(() => <MarketsHeader />, [])

  const rows = useRows({ limit: ASSETS_LIMIT })

  const body = useMemo(
    () =>
      Object.values(rows).map((row, i) => (
        <MarketsRow
          key={i}
          title={row.title}
          subtitle={row.subtitle}
          supportedChainIds={row.supportedChainIds}
          category={row.category}
          showSparkline={i === 0}
        >
          {row.component}
        </MarketsRow>
      )),
    [rows],
  )

  return (
    <Main headerComponent={headerComponent} isSubPage>
      <SEO title={translate('navBar.markets')} />
      <Box py={4}>{body}</Box>
    </Main>
  )
}
