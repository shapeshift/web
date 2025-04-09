import { Flex } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'

import { Amount } from '@/components/Amount/Amount'
import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import {
  selectFeeAssetByChainId,
  selectPortfolioTotalChainIdBalanceUserCurrency,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ChainRowProps = {
  chainId: ChainId
  includeBalance?: boolean
}
export const ChainRow: React.FC<ChainRowProps> = ({ chainId, includeBalance }) => {
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const chainFiatBalanceFilter = useMemo(() => ({ chainId }), [chainId])
  const chainFiatBalance = useAppSelector(s =>
    selectPortfolioTotalChainIdBalanceUserCurrency(s, chainFiatBalanceFilter),
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
