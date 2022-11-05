import { Box, Icon } from '@chakra-ui/react'
import type { AssetId } from '@keepkey/caip'
import { FaBan, FaCheck } from 'react-icons/fa'
import { AssetIcon } from 'components/AssetIcon'
import { IconCircle } from 'components/IconCircle'
import { bn } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export const ApproveIcon = ({
  assetId,
  value,
  compactMode,
}: {
  assetId: AssetId
  value: string
  compactMode: boolean
}) => {
  const approvedAsset = useAppSelector(state => selectAssetById(state, assetId))
  const approvedValue = bn(value)

  const isRevoke = approvedValue.isZero()

  return (
    <Box position='relative'>
      <IconCircle
        position='absolute'
        right='0px'
        top='0px'
        zIndex='1'
        padding={0}
        boxSize='50%'
        bg={isRevoke ? 'red.500' : 'green.500'}
      >
        <Icon as={isRevoke ? FaBan : FaCheck} width='50%' color='black' />
      </IconCircle>
      <AssetIcon
        src={approvedAsset?.icon}
        boxSize={{ base: '24px', md: compactMode ? '24px' : '40px' }}
      />
    </Box>
  )
}
