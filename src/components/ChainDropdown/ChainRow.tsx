import { Flex } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { Amount } from 'components/Amount/Amount'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { chainIdToFeeAssetId } from 'state/slices/portfolioSlice/utils'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ChainRowProps = {
  chainId: ChainId
  fiatBalance?: string
}

export const ChainRow: React.FC<ChainRowProps> = ({ chainId, fiatBalance }) => {
  const feeAssetId = chainIdToFeeAssetId(chainId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

  if (!feeAsset) return null

  return (
    <Flex alignItems='center' gap={4}>
      <LazyLoadAvatar src={feeAsset.networkIcon ?? feeAsset.icon} size='xs' />
      {feeAsset.networkName ?? feeAsset.name}
      {fiatBalance && <Amount.Fiat ml='auto' value={fiatBalance} />}
    </Flex>
  )
}
