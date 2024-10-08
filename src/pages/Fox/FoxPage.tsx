import { Divider } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { FoxHeader } from './components/FoxHeader'
import { FoxToken } from './components/FoxToken'
import { RFOXSection } from './components/RFOXSection'
import { FoxPageProvider } from './hooks/useFoxPageContext'

export const FoxPage = () => {
  const translate = useTranslate()
  const headerComponent = useMemo(() => <FoxHeader />, [])
  const isRFOXEnabled = useFeatureFlag('FoxPageRFOX')

  const MaybeRFOXSection = useCallback(() => {
    if (!isRFOXEnabled) return null

    return (
      <>
        <Divider mb={4} />
        <RFOXSection />
      </>
    )
  }, [isRFOXEnabled])

  return (
    <FoxPageProvider assetId={foxAssetId}>
      <SEO title={translate('navBar.foxBenefits')} />
      <Main headerComponent={headerComponent}>
        <Divider mb={4} />
        <FoxToken />
        <MaybeRFOXSection />
      </Main>
    </FoxPageProvider>
  )
}
