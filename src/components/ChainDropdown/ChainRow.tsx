import { Flex } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { chainIdToFeeAssetId } from 'lib/utils'
import {
  selectAssetById,
  selectPortfolioTotalChainIdBalanceIncludeStaking,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ChainRowProps = {
  chainId: ChainId
  includeBalance?: boolean
}
export const ChainRow: React.FC<ChainRowProps> = ({ chainId, includeBalance }) => {
  const feeAssetId = chainIdToFeeAssetId(chainId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  const filter = useMemo(() => ({ chainId }), [chainId])
  const chainFiatBalance = useAppSelector(s =>
    selectPortfolioTotalChainIdBalanceIncludeStaking(s, filter),
  )
  if (!feeAsset) return null

  return (
    <Flex alignItems='center' gap={4}>
      <LazyLoadAvatar src={feeAsset.networkIcon ?? feeAsset.icon} size='xs' />
      {feeAsset.networkName ?? feeAsset.name}
      {includeBalance && <Amount.Fiat ml='auto' value={chainFiatBalance} />}
    </Flex>
  )
}
