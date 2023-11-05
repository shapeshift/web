import { CheckCircleIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/react'
import { Tag, TagLeftIcon } from '@chakra-ui/tag'
import type { AssetId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { RawText, Text } from 'components/Text'
import { usePoolDataQuery } from 'pages/Lending/hooks/usePoolDataQuery'
import { selectAssetById } from 'state/slices/assetsSlice/selectors'
import { useAppSelector } from 'state/store'

import { DynamicComponent } from './PoolStat'

const labelProps = { fontSize: 'sm ' }

type PoolInfoProps = {
  poolAssetId: AssetId
}

export const PoolInfo = ({ poolAssetId }: PoolInfoProps) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, poolAssetId))

  const usePoolDataArgs = useMemo(() => ({ poolAssetId }), [poolAssetId])
  const { data: poolData, isLoading: isPoolDataLoading } = usePoolDataQuery(usePoolDataArgs)
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
    () => (
      <Amount.Percent
        value={poolData?.collateralizationRatioPercentDecimal ?? '0'}
        color='text.success'
        fontSize='lg'
      />
    ),
    [poolData?.collateralizationRatioPercentDecimal],
  )
  const totalBorrowersComponent = useMemo(
    () => <RawText fontSize='lg'>{poolData?.totalBorrowers ?? '0'}</RawText>,
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
