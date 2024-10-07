import type { StackProps } from '@chakra-ui/react'
import { Box, Heading } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'
import { FeeExplainer } from 'components/FeeExplainer/FeeExplainer'

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

export const FoxToken = () => {
  const translate = useTranslate()

  return (
    <Box>
      <Heading as='h2' fontSize='2xl' display='flex' alignItems='center'>
        <AssetIcon assetId={foxAssetId} showNetworkIcon={false} me={2} />
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
  )
}
