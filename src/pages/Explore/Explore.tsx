import { memo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'

export const Explore = memo(() => {
  const translate = useTranslate()
  return (
    <Main pt='4.5rem' mt='-4.5rem' px={0} display='flex' flex={1} width='full' hideBreadcrumbs>
      <SEO title={translate('navBar.explore')} />
      <p>Explore</p>
    </Main>
  )
})
