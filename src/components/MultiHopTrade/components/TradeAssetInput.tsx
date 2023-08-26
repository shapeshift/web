import { Skeleton, SkeletonCircle, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import React, { memo, useMemo } from 'react'
import type { TradeAmountInputProps } from 'components/MultiHopTrade/components/TradeAmountInput'
import { TradeAmountInput } from 'components/MultiHopTrade/components/TradeAmountInput'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectMarketDataById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const AssetInputAwaitingAsset = () => {
  const bgColor = useColorModeValue('white', 'gray.850')
  return (
    <Stack bgColor={bgColor} py={2} px={4} borderRadius='xl' spacing={0}>
      <Stack direction='row' justifyContent='space-between' alignItems='center'>
        <Stack direction='row' alignItems='center'>
          <SkeletonCircle height='32px' />
          <Skeleton height='21px' width='50px' />
        </Stack>
        <Skeleton height='21px' width='100px' />
      </Stack>
      <Stack alignItems='flex-end'>
        <Skeleton height='14px' width='50px' />
      </Stack>
    </Stack>
  )
}

type AssetInputLoadedProps = TradeAmountInputProps & { assetId: AssetId }

const AssetInputWithAsset: React.FC<AssetInputLoadedProps> = props => {
  const { assetId, accountId } = props
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const filter = useMemo(
    () => ({
      accountId: accountId ?? '',
      assetId,
    }),
    [accountId, assetId],
  )
  const balance = useAppSelector(state =>
    selectPortfolioCryptoPrecisionBalanceByFilter(state, filter),
  )
  const fiatBalance = bnOrZero(balance).times(marketData.price).toString()

  return <TradeAmountInput balance={balance} fiatBalance={fiatBalance} {...props} />
}

export type TradeAssetInputProps = {
  assetId?: AssetId
} & TradeAmountInputProps

export const TradeAssetInput: React.FC<TradeAssetInputProps> = memo(
  ({ assetId, accountId, ...restAssetInputProps }) => {
    return assetId ? (
      <AssetInputWithAsset assetId={assetId} accountId={accountId} {...restAssetInputProps} />
    ) : (
      <AssetInputAwaitingAsset />
    )
  },
)
