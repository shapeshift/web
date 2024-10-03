import { Box, Heading } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { AssetIcon } from 'components/AssetIcon'

import { FoxTokenHeader } from './FoxTokenHeader'

export const FoxToken = () => {
  const translate = useTranslate()

  return (
    <Box>
      <Heading as='h2' fontSize='2xl' display='flex' alignItems='center'>
        <AssetIcon assetId={foxAssetId} showNetworkIcon={false} me={2} />
        {translate('foxPage.foxToken')}
      </Heading>

      <FoxTokenHeader />
    </Box>
  )
}
