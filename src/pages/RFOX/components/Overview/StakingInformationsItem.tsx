import { Flex, Skeleton, Stack } from '@chakra-ui/react'
import { type AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakingInformationsItemProps = {
  informationDescription: string
  value?: string
} & (
  | {
      assetId: AssetId
      amountCryptoBaseUnit: string
    }
  | {
      assetId?: never
      amountCryptoBaseUnit?: never
    }
)

export const StakingInformationsItem = ({
  informationDescription,
  assetId,
  value,
  amountCryptoBaseUnit,
}: StakingInformationsItemProps) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))

  const marketDataUserCurrency = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, assetId ?? ''),
  )

  const amountUserCurrency = useMemo(
    () =>
      amountCryptoBaseUnit && marketDataUserCurrency && asset
        ? bnOrZero(fromBaseUnit(amountCryptoBaseUnit, asset.precision))
            .times(marketDataUserCurrency.price)
            .toFixed(2)
        : undefined,
    [amountCryptoBaseUnit, marketDataUserCurrency, asset],
  )

  return (
    <Stack spacing={0} flex={1} flexDir={'column'}>
      <Text
        fontSize='sm'
        color='text.subtle'
        fontWeight='medium'
        translation={informationDescription}
      />
      <Skeleton isLoaded={true}>
        <Flex alignItems='center' gap={2}>
          {asset && amountCryptoBaseUnit && (
            <Amount.Crypto
              fontSize='xl'
              value={fromBaseUnit(amountCryptoBaseUnit, asset.precision)}
              symbol={asset?.symbol}
              fontWeight='medium'
            />
          )}
          {value && <Text fontSize='xl' fontWeight='medium' translation={value} />}
        </Flex>
      </Skeleton>

      {amountUserCurrency && (
        <Skeleton isLoaded={true}>
          <Amount.Fiat fontSize='xs' value={amountUserCurrency} color='text.subtle' />
        </Skeleton>
      )}
    </Stack>
  )
}
