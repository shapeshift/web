import { Skeleton, SkeletonCircle, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import React, { memo, useCallback, useMemo } from 'react'
import type { TradeAmountInputProps } from 'components/MultiHopTrade/components/TradeAmountInput'
import { TradeAmountInput } from 'components/MultiHopTrade/components/TradeAmountInput'
import { bnOrZero } from 'lib/bignumber/bignumber'
import {
  selectMarketDataByAssetIdUserCurrency,
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

type AssetInputLoadedProps = Omit<TradeAmountInputProps, 'onMaxClick'> & {
  assetId: AssetId
  onMaxClick?: (isFiat: boolean) => Promise<void>
}

const AssetInputWithAsset: React.FC<AssetInputLoadedProps> = memo(props => {
  const { assetId, accountId } = props
  const marketData = useAppSelector(state => selectMarketDataByAssetIdUserCurrency(state, assetId))

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

  const onMaxClick = useCallback(
    (isFiat: boolean) => {
      if (props.onMaxClick) return props.onMaxClick(isFiat)

      const value = isFiat ? fiatBalance : balance
      if (props.onChange) props.onChange(value, isFiat)
      return Promise.resolve()
    },
    [balance, fiatBalance, props],
  )

  return (
    <TradeAmountInput
      balance={balance}
      fiatBalance={fiatBalance}
      onMaxClick={onMaxClick}
      {...props}
    />
  )
})

export type TradeAssetInputProps = {
  assetId?: AssetId
  hideAmounts?: boolean
  onMaxClick?: (isFiat: boolean) => Promise<void>
} & Omit<TradeAmountInputProps, 'onMaxClick'>

export const TradeAssetInput: React.FC<TradeAssetInputProps> = memo(
  ({ assetId, accountId, ...restAssetInputProps }) => {
    return assetId ? (
      <AssetInputWithAsset assetId={assetId} accountId={accountId} {...restAssetInputProps} />
    ) : (
      <AssetInputAwaitingAsset />
    )
  },
)
