import { IconButton, Tooltip, useMediaQuery } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { memo, useCallback, useMemo } from 'react'
import { AssetIcon } from 'components/AssetIcon'
import { chainIdToFeeAssetId } from 'lib/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'
import { breakpoints } from 'theme/theme'

type ChainCardProps = {
  chainId: ChainId
  isActive?: boolean
  onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => (arg: ChainId | 'All') => void
}

export const ChainCard: React.FC<ChainCardProps> = memo(({ chainId, isActive, onClick }) => {
  const feeAssetId = chainIdToFeeAssetId(chainId)
  if (!feeAssetId) throw new Error(`feeAssetId not found for chainId ${chainId}`)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  if (!feeAsset) throw new Error(`Fee asset not found for AssetId ${feeAssetId}`)

  const assetIcon = useMemo(
    () => <AssetIcon size='sm' showNetworkIcon assetId={feeAssetId} />,
    [feeAssetId],
  )

  const [isLargerThanMd] = useMediaQuery(`(min-width: ${breakpoints['md']})`)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => onClick(e)(chainId),
    [chainId, onClick],
  )
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
        onClick={handleClick}
        icon={assetIcon}
      />
    </Tooltip>
  )
})
