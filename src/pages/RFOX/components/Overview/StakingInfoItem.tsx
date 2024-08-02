import { Flex, Skeleton, Stack } from '@chakra-ui/react'
import { type AssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/chain-adapters'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type StakingInfoItemProps = {
  informationDescription: string
  helperTranslation?: string
  isLoading: boolean
} & (
  | {
      value?: never
      assetId: AssetId
      amountCryptoBaseUnit: string | undefined
    }
  | {
      value: string | undefined
      assetId?: never
      amountCryptoBaseUnit?: never
    }
)

export const StakingInfoItem = ({
  informationDescription,
  assetId,
  helperTranslation,
  value,
  amountCryptoBaseUnit,
  isLoading,
}: StakingInfoItemProps) => {
  const translate = useTranslate()
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

  const helperIconProps = useMemo(() => {
    return { boxSize: !helperTranslation ? 0 : undefined }
  }, [helperTranslation])

  const maybeCryptoAmount = useMemo(() => {
    if (!asset) return null

    return (
      <Amount.Crypto
        fontSize='xl'
        value={fromBaseUnit(amountCryptoBaseUnit, asset.precision)}
        symbol={asset?.symbol}
        fontWeight='medium'
      />
    )
  }, [asset, amountCryptoBaseUnit])

  const maybeValue = useMemo(() => {
    if (!value) return null
    return <Text fontSize='xl' fontWeight='medium' translation={value} />
  }, [value])

  return (
    <Stack spacing={0} flex={1} flexDir={'column'}>
      <HelperTooltip label={translate(helperTranslation)} iconProps={helperIconProps}>
        <Text
          fontSize='sm'
          color='text.subtle'
          fontWeight='medium'
          translation={informationDescription}
        />
      </HelperTooltip>
      <Skeleton height='30px' isLoaded={!isLoading}>
        <Flex alignItems='center' gap={2}>
          {maybeCryptoAmount}
          {maybeValue}
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
