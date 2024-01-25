import { Flex } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { AssetIcon } from 'components/AssetIcon'
import { AssetSymbol } from 'components/AssetSymbol'

export const ReadOnlyAsset: React.FC<{ assetId: AssetId }> = ({ assetId }) => {
  return (
    <Flex
      borderRadius='full'
      pl={1.5}
      pr={3}
      py={1.5}
      gap={2}
      alignItems='center'
      bg='background.surface.raised.base'
    >
      <AssetIcon size='xs' assetId={assetId} showNetworkIcon={false} />
      <AssetSymbol assetId={assetId} fontSize='sm' fontWeight='medium' />
    </Flex>
  )
}
