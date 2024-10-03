import { Box } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'

import { FoxHeader } from './components/FoxHeader'
import { FoxToken } from './components/FoxToken'
import { FoxPageProvider } from './hooks/useFoxPageContext'

const containerPaddingX = { base: 4, xl: 0 }

export const FoxPage = () => {
  const translate = useTranslate()
  const headerComponent = useMemo(() => <FoxHeader />, [])

  return (
    <FoxPageProvider assetId={foxAssetId}>
      <Main headerComponent={headerComponent}>
        <SEO title={translate('navBar.foxBenefits')} />
        <Box py={4} px={containerPaddingX}>
          <FoxToken />
        </Box>
      </Main>
    </FoxPageProvider>
  )
}
