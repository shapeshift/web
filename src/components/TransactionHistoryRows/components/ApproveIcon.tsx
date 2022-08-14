import { Box, Icon } from '@chakra-ui/react'
import { AssetId } from '@shapeshiftoss/caip'
import { FaBan, FaCheck } from 'react-icons/fa'
import { AssetIcon } from 'components/AssetIcon'
import { IconCircle } from 'components/IconCircle'
import { bnOrZero } from 'lib/bignumber/bignumber'
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
  const approvedValue = bnOrZero(value)

  // TODO: Abstract at parent component-level and pass it down as a prop?
  const isRevoke = approvedValue.isZero()

  return (
    <Box position='relative'>
      <IconCircle
        position='absolute'
        right='0px'
        top='0px'
        zIndex='1'
        boxSize={'18px'}
        bg={isRevoke ? 'red.500' : 'green.500'}
      >
        <Icon as={isRevoke ? FaBan : FaCheck} width='10px' color='black' />
      </IconCircle>
      <AssetIcon
        src={approvedAsset?.icon}
        boxSize={{ base: '24px', md: compactMode ? '24px' : '40px' }}
      />
    </Box>
  )
}
