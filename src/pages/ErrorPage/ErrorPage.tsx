import type { FallbackProps } from 'react-error-boundary'

import { ErrorPageContent } from '@/components/ErrorPage/ErrorPageContent'
import { Layout } from '@/components/Layout/Layout'
import { Main } from '@/components/Layout/Main'

export const ErrorPage: React.FC<FallbackProps> = () => {
  return (
    <Layout display='flex'>
      <Main height='100%' display='flex' width='full'>
        <ErrorPageContent />
      </Main>
    </Layout>
  )
}
