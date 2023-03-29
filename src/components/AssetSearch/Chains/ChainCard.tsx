import { IconButton, Tooltip, useMediaQuery } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { AssetIcon } from 'components/AssetIcon'
import { chainIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

type ChainCardProps = {
  chainId: ChainId
  isActive?: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => (arg: ChainId | 'All') => void
}
export const ChainCard: React.FC<ChainCardProps> = ({ chainId, isActive, onClick }) => {
  const feeAssetId = chainIdToFeeAssetId(chainId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`, { ssr: false })
  return (
    <Tooltip
      label={feeAsset.networkName ?? feeAsset.name}
      placement='top'
      isDisabled={!isLargerThanMd}
    >
      <IconButton
        size='lg'
        variant='outline'
        isActive={isActive}
        aria-label={feeAsset.name}
        onClick={e => onClick(e)(chainId)}
        icon={<AssetIcon size='sm' showNetworkIcon assetId={feeAssetId} />}
      />
    </Tooltip>
  )
}
