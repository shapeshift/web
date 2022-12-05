import { IconButton } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { AssetIcon } from 'components/AssetIcon'
import { chainIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ChainCardProps = {
  chainId: ChainId
  isActive?: boolean
  onClick: (arg: ChainId) => void
}
export const ChainCard: React.FC<ChainCardProps> = ({ chainId, isActive, onClick }) => {
  const feeAssetId = chainIdToFeeAssetId(chainId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId))
  return (
    <IconButton
      size='lg'
      variant='outline'
      isActive={isActive}
      aria-label={feeAsset.name}
      onClick={() => onClick(chainId)}
      icon={<AssetIcon size='sm' src={feeAsset.icon} />}
    />
  )
}
