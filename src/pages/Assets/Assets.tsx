import { Flex } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Display } from '@/components/Display'
import { ComponentErrorBoundary } from '@/components/ErrorBoundary'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'
import { MarketsTableVirtualized } from '@/components/MarketTableVirtualized/MarketsTableVirtualized'
import { GlobalFilter } from '@/components/StakingVaults/GlobalFilter'
import { RawText } from '@/components/Text'
import { useModal } from '@/hooks/useModal/useModal'
import { searchAssets } from '@/lib/assetSearch'
import { selectAssetsNoSpam } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const Assets = () => {
  const translate = useTranslate()
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()
  const assetsNoSpam = useAppSelector(selectAssetsNoSpam)
  const assetActionsDrawer = useModal('assetActionsDrawer')

  const filterRowsBySearchTerm = useCallback((rows: Asset[], filterValue: unknown) => {
    if (!filterValue || typeof filterValue !== 'string') return rows
    return searchAssets(filterValue.trim(), rows)
  }, [])
  const rows = useMemo(() => {
    return searchQuery ? filterRowsBySearchTerm(assetsNoSpam, searchQuery) : assetsNoSpam
  }, [assetsNoSpam, filterRowsBySearchTerm, searchQuery])

  const handleRowClick = useCallback(
    (asset: Asset) => {
      const { assetId } = asset
      const url = assetId ? `/assets/${assetId}` : ''
      navigate(url)
    },
    [navigate],
  )

  const handleRowLongPress = useCallback(
    (asset: Asset) => {
      const { assetId } = asset
      assetActionsDrawer.open({ assetId })
    },
    [assetActionsDrawer],
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
      <ComponentErrorBoundary>
        <MarketsTableVirtualized
          rows={rows}
          onRowClick={handleRowClick}
          onRowLongPress={handleRowLongPress}
        />
      </ComponentErrorBoundary>
    </Main>
  )
}
