import { Box, Divider, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { useFoxPageContext } from '../hooks/useFoxPageContext'
import { FoxTokenBalances } from './FoxTokenBalances'
import { FoxTokenHeader } from './FoxTokenHeader'

import { AssetIcon } from '@/components/AssetIcon'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

const containerPaddingX = { base: 4, xl: 0 }

export const FoxToken = () => {
  const translate = useTranslate()
  const { assetId } = useFoxPageContext()
  const isRfoxSectionEnabled = useFeatureFlag('FoxPageFoxSection')

  if (!isRfoxSectionEnabled) return null

  return (
    <>
      <Divider mb={4} id='token' />
      <Box py={4} px={containerPaddingX} scrollMarginTop={300}>
        <Heading as='h2' fontSize='2xl' display='flex' alignItems='center'>
          <AssetIcon assetId={assetId} showNetworkIcon={false} me={2} />
          {translate('foxPage.foxToken')}
        </Heading>
        <FoxTokenHeader />
        <FoxTokenBalances />
      </Box>
    </>
  )
}
