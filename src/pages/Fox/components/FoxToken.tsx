import type { StackProps } from '@chakra-ui/react'
import { Box, Divider, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'

import { useFoxPageContext } from '../hooks/useFoxPageContext'
import { FoxTokenBalances } from './FoxTokenBalances'
import { FoxTokenHeader } from './FoxTokenHeader'

import { AssetIcon } from '@/components/AssetIcon'
import { FeeExplainer } from '@/components/FeeExplainer/FeeExplainer'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'

const stackProps: StackProps = {
  flexDir: 'row',
  flexWrap: { base: 'wrap', md: 'nowrap' },
  my: 4,
  maxWidth: '100%',
  borderRadius: '2xl',
  overflow: 'hidden',
}
const containerPaddingX = { base: 4, xl: 0 }
const DEFAULT_FEE_EXPLAINER_INPUT_AMOUNT = '1400'

export const FoxToken = () => {
  const translate = useTranslate()
  const { assetId } = useFoxPageContext()
  const isRfoxSectionEnabled = useFeatureFlag('FoxPageFoxSection')

  if (!isRfoxSectionEnabled) return null

  return (
    <>
      <Divider mb={4} />
      <Box py={4} px={containerPaddingX}>
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
