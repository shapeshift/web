import { CheckCircleIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/react'
import { Tag, TagLeftIcon } from '@chakra-ui/tag'
import type { AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText, Text } from 'components/Text'
import { bn } from 'lib/bignumber/bignumber'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { getAllThorchainLendingPositions } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
import { fromThorBaseUnit } from 'state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import { useAppSelector } from 'state/store'

import { DynamicComponent } from './PoolStat'

const labelProps = { fontSize: 'sm ' }

type PoolInfoProps = {
  poolAssetId: AssetId
}

export const PoolInfo = ({ poolAssetId }: PoolInfoProps) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, poolAssetId))

  const poolDataQueryKey: [string, { assetId: AssetId }] = useMemo(
    () => ['thorchainLendingPoolData', { assetId: poolAssetId }],
    [poolAssetId],
  )

  const { data: poolData, isLoading: isPoolDataLoading } = useQuery({
    // TODO(gomes): we may or may not want to change this, but this avoids spamming the API for the time being.
    // by default, there's a 5mn cache time, but a 0 stale time, meaning queries are considered stale immediately
    // Since react-query queries aren't persisted, and until we have an actual need for ensuring the data is fresh,
    // this is a good way to avoid spamming the API during develpment
    staleTime: Infinity,
    queryKey: poolDataQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { assetId }] = queryKey
      const positions = await getAllThorchainLendingPositions(assetId)
      return positions
    },
    select: data => {
      // returns actual derived data, or zero's out fields in case there is no active position
      const totalBorrowers = data?.length ?? 0

      const { totalCollateral, totalDebt } = data.reduce(
        (acc, position) => {
          acc.totalCollateral = acc.totalCollateral.plus(position.collateral_current)
          acc.totalDebt = acc.totalDebt.plus(position.debt_current)

          return acc
        },
        {
          totalCollateral: bn(0),
          totalDebt: bn(0),
        },
      )

      const totalCollateralCryptoPrecision = fromThorBaseUnit(totalCollateral).toString()
      const totalDebtUSD = fromThorBaseUnit(totalDebt).toString()

      return { totalBorrowers, totalCollateralCryptoPrecision, totalDebtUSD }
    },
    enabled: true,
  })

  const totalCollateralComponent = useMemo(
    () => (
      <Amount.Crypto
        fontSize='2xl'
        value={poolData?.totalCollateralCryptoPrecision ?? '0'}
        symbol={asset?.symbol ?? ''}
        fontWeight='medium'
      />
    ),
    [asset?.symbol, poolData?.totalCollateralCryptoPrecision],
  )
  const totalDebtBalance = useMemo(
    () => <Amount.Fiat fontSize='2xl' value={poolData?.totalDebtUSD ?? '0'} fontWeight='medium' />,
    [poolData?.totalDebtUSD],
  )
  const estCollateralizationRatioComponent = useMemo(
    () => <Amount.Percent value={2.93} color='text.success' fontSize='lg' />,
    [],
  )
  const totalBorrowersComponent = useMemo(
    () => <RawText fontSize='lg'>{poolData?.totalBorrowers}</RawText>,
    [poolData?.totalBorrowers],
  )

  if (!asset) return null

  return (
    <>
      <Flex gap={4} alignItems='center'>
        <Text translation='lending.poolInformation' fontWeight='medium' />
        <Tag colorScheme='green'>
          <TagLeftIcon as={CheckCircleIcon} />
          {translate('lending.healthy')}
        </Tag>
      </Flex>
      <Flex>
        <DynamicComponent
          isLoading={isPoolDataLoading}
          label='lending.totalCollateral'
          component={totalCollateralComponent}
          flex={1}
          labelProps={labelProps}
        />
        <DynamicComponent
          isLoading={isPoolDataLoading}
          label='lending.totalDebtBalance'
          component={totalDebtBalance}
          flex={1}
          labelProps={labelProps}
        />
      </Flex>
      <Flex>
        <DynamicComponent
          isLoading={isPoolDataLoading}
          label='lending.estCollateralizationRatio'
          component={estCollateralizationRatioComponent}
          flex={1}
          labelProps={labelProps}
        />
        <DynamicComponent
          isLoading={isPoolDataLoading}
          label='lending.totalBorrowers'
          component={totalBorrowersComponent}
          flex={1}
          labelProps={labelProps}
        />
      </Flex>
    </>
  )
}
