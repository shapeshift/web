import type { AvatarProps } from '@chakra-ui/react'
import { Flex } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'

type PoolIconProps = {
  assetIds: AssetId[]
  size?: AvatarProps['size']
}

const lastStyle = {
  marginLeft: '-0.5em',
}
const firstStyle = {
  marginLeft: '0em',
}

export const PoolIcon: React.FC<PoolIconProps> = ({ assetIds, size = 'md' }) => {
  const renderIcons = useMemo(() => {
    return assetIds.map(assetId => (
      <AssetIcon
        key={assetId}
        size={size}
        assetId={assetId}
        showNetworkIcon={false}
        _last={lastStyle}
        _first={firstStyle}
      />
    ))
  }, [assetIds, size])
  return <Flex>{renderIcons}</Flex>
}
