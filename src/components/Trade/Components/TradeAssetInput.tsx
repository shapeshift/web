import { Skeleton, SkeletonCircle, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/investor-foxy'
import React, { useMemo } from 'react'
import type { AssetInputProps } from 'components/DeFi/components/AssetInput'
import { AssetInput } from 'components/DeFi/components/AssetInput'
import {
  selectMarketDataById,
  selectPortfolioCryptoHumanBalanceByFilter,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const AssetInputLoading = () => {
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

type AssetInputLoadedProps = AssetInputProps & { assetId: AssetId }

const AssetInputLoaded: React.FC<AssetInputLoadedProps> = props => {
  const { assetId, accountId } = props
  const marketData = useAppSelector(state => selectMarketDataById(state, assetId))

  const filter = useMemo(
    () => ({
      accountId: accountId ?? '',
      assetId,
    }),
    [accountId, assetId],
  )
  const balance = useAppSelector(state => selectPortfolioCryptoHumanBalanceByFilter(state, filter))
  const fiatBalance = bnOrZero(balance).times(marketData.price).toString()

  return <AssetInput balance={balance} fiatBalance={fiatBalance} {...props} />
}

export type TradeAssetInputProps = {
  assetId?: AssetId
} & AssetInputProps

export const TradeAssetInput: React.FC<TradeAssetInputProps> = ({
  assetId,
  accountId,
  ...restAssetInputProps
}) => {
  return assetId ? (
    <AssetInputLoaded assetId={assetId} accountId={accountId} {...restAssetInputProps} />
  ) : (
    <AssetInputLoading />
  )
}
