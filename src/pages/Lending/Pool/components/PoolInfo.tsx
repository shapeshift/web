import { CheckCircleIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/react'
import { Tag, TagLeftIcon } from '@chakra-ui/tag'
import type { AssetId } from '@shapeshiftoss/caip'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText, Text } from 'components/Text'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { getAllThorchainLendingPositions } from 'state/slices/opportunitiesSlice/resolvers/thorchainLending/utils'
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
    queryKey: poolDataQueryKey,
    queryFn: async ({ queryKey }) => {
      const [, { assetId }] = queryKey
      const positions = await getAllThorchainLendingPositions(assetId)
      return positions
    },
    select: data => {
      // returns actual derived data, or zero's out fields in case there is no active position
      const totalBorrowers = data?.length ?? 0

      return {
        totalBorrowers,
      }
    },
    enabled: true,
  })

  const totalCollateralComponent = useMemo(
    () => (
      <Amount.Crypto fontSize='2xl' value='25' symbol={asset?.symbol ?? ''} fontWeight='medium' />
    ),
    [asset?.symbol],
  )
  const totalDebtBalance = useMemo(
    () => <Amount.Fiat fontSize='2xl' value={25} fontWeight='medium' />,
    [],
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
