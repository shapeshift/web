import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'

import { Markets } from './Markets'

export const Assets = () => {
  const translate = useTranslate()
  return (
    <Main display='flex' flexDir='column' minHeight='calc(100vh - 72px)' isSubPage>
      <SEO title={translate('navBar.assets')} />
      <Markets />
    </Main>
  )
}
