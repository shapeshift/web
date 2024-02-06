import type { AvatarProps } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { AssetIcon, sansNotchBottom, sansNotchTop } from 'components/AssetIcon'

type PoolIconProps = {
  assetIds: AssetId[]
  size?: AvatarProps['size']
}

export const PoolIcon: React.FC<PoolIconProps> = ({ assetIds, size = 'md' }) => {
  const renderIcons = useMemo(() => {
    return assetIds.map((assetId, index) => (
      <AssetIcon
        key={assetId}
        size={size}
        assetId={assetId}
        showNetworkIcon={false}
        clipPath={index === 0 ? sansNotchTop : sansNotchBottom}
        position={index === 0 ? 'static' : 'absolute'}
        left={0}
      />
    ))
  }, [assetIds, size])
  return <Flex position='relative'>{renderIcons}</Flex>
}
