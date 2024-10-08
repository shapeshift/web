import { Box, Flex, Heading, Tag } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'

const containerPaddingX = { base: 4, xl: 0 }

export const RFOXSection = () => {
  const translate = useTranslate()

  return (
    <Box py={4} px={containerPaddingX}>
      <Flex alignItems='center'>
        <Box>
          <Heading as='h2' fontSize='2xl' display='flex' alignItems='center'>
            <AssetIcon assetId={foxAssetId} showNetworkIcon={false} me={2} />
            {translate('foxPage.rfox.title')}
            <Tag colorScheme='green' verticalAlign='middle' ml={2}>
              <Amount.Percent value={'0.023' ?? 0} suffix='APY' />
            </Tag>
          </Heading>
          <Text fontSize='md' color='text.subtle' mt={2} translation='foxPage.rfox.whatIs' />
        </Box>
      </Flex>
    </Box>
  )
}
