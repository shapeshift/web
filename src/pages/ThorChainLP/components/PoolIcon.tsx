import type { AvatarProps } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'

type PoolIconProps = {
  assetIds: AssetId[]
  size?: AvatarProps['size']
}

export const PoolIcon: React.FC<PoolIconProps> = ({ assetIds, size = 'md' }) => {
  const renderIcons = useMemo(() => {
    return assetIds.map(assetId => <AssetIcon size={size} assetId={assetId} />)
  }, [assetIds, size])
  return <Flex>{renderIcons}</Flex>
}
