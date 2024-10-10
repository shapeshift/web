import type { StackProps } from '@chakra-ui/react'
import { Box, Divider, Heading } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { FeeExplainer } from 'components/FeeExplainer/FeeExplainer'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'

import { useFoxPageContext } from '../hooks/useFoxPageContext'
import { FoxTokenBalances } from './FoxTokenBalances'
import { FoxTokenHeader } from './FoxTokenHeader'

const stackProps: StackProps = {
  flexDir: 'row',
  flexWrap: { base: 'wrap', md: 'nowrap' },
  my: 4,
  maxWidth: '100%',
  borderRadius: '10',
  overflow: 'hidden',
}
const containerPaddingX = { base: 4, xl: 0 }

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
        <FeeExplainer
          inputAmountUsd={'1400'}
          boxShadow='none'
          feeModel={'SWAPPER'}
          maxWidth='100%'
          width='full'
          borderRadius='0'
          borderTopWidth='0'
          stackProps={stackProps}
        />
      </Box>
    </>
  )
}
