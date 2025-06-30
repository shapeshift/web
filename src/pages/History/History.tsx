import type { StackDirection } from '@chakra-ui/react'
import { Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { Display } from '@/components/Display'
import { ActionCenter } from '@/components/Layout/Header/ActionCenter/ActionCenter'
import { PageBackButton, PageHeader } from '@/components/Layout/Header/PageHeader'
import { Main } from '@/components/Layout/Main'
import { SEO } from '@/components/Layout/Seo'

const maxWidth = { base: '100%', md: '450px' }
const mainPaddingBottom = { base: 16, md: 8 }

const HistoryHeader = () => {
  const translate = useTranslate()
  const navigate = useNavigate()

  const handleBack = useCallback(() => {
    navigate('/explore')
  }, [navigate])

  return (
    <>
      <PageHeader>
        <SEO title={translate('history.heading')} />
        <Display.Mobile>
          <PageHeader.Left>
            <PageBackButton onBack={handleBack} />
          </PageHeader.Left>
          <PageHeader.Middle>
            <PageHeader.Title>{translate('history.heading')}</PageHeader.Title>
          </PageHeader.Middle>
        </Display.Mobile>
      </PageHeader>
    </>
  )
}

const historyHeader = <HistoryHeader />

export const History = () => {
  return (
    <Main pb={mainPaddingBottom} headerComponent={historyHeader} px={4} isSubPage>
      <Stack spacing={4} width='full'></Stack>
      <Stack flex={1} width='full' maxWidth={maxWidth} spacing={4}>
        <ActionCenter />
      </Stack>
    </Main>
  )
}
