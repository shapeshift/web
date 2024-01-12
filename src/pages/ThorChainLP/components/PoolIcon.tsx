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
    return assetIds.map((assetId, index) => (
      <AssetIcon
        key={assetId}
        size={size}
        assetId={assetId}
        showNetworkIcon={false}
        ml={index + 1 === assetIds.length ? '-0.5em' : 0}
        zIndex={index + 1 === assetIds.length ? 4 : 'inherit'}
      />
    ))
  }, [assetIds, size])
  return <Flex>{renderIcons}</Flex>
}
