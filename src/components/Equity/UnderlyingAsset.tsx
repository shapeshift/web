import { Flex } from '@chakra-ui/react'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'

import { Amount } from '@/components/Amount/Amount'
import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import type { AssetWithBalance } from '@/features/defi/components/Overview/Overview'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const UnderlyingAsset: React.FC<AssetWithBalance> = ({
  cryptoBalancePrecision,
  assetId,
  icon,
}) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

  const fiatAmount = useMemo(() => {
    return bnOrZero(cryptoBalancePrecision)
      .times(bnOrZero(marketData?.price))
      .toString()
  }, [cryptoBalancePrecision, marketData?.price])

  return (
    <Flex gap={2} fontSize='sm' alignItems='center' fontWeight='medium'>
      <LazyLoadAvatar display='flex' src={icon} size='2xs' />
      <Amount.Crypto value={cryptoBalancePrecision} symbol={asset?.symbol ?? ''} />
      <Amount.Fiat
        color='text.subtle'
        value={fiatAmount}
        _before={{ content: '"("' }}
        _after={{ content: '")"' }}
      />
    </Flex>
  )
}
