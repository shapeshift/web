import type { FlexProps } from '@chakra-ui/react'
import { Card, CardBody, Heading, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { usdcOnArbitrumOneAssetId } from '@shapeshiftoss/caip'
import { BigAmount } from '@shapeshiftoss/utils'
import { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { RFOXSliders } from './RFOXSliders'

import { Amount } from '@/components/Amount/Amount'
import { Text } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { getStakingContract } from '@/pages/RFOX/helpers'
import { useCurrentEpochMetadataQuery } from '@/pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { useTotalStakedQuery } from '@/pages/RFOX/hooks/useGetTotalStaked'
import { selectAssetById, selectUsdRateByAssetId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const stackFlexDir: FlexProps['flexDir'] = { base: 'column', md: 'row' }
const rfoxSimulatorCardBody = { base: 4, md: 8 }
const columnsProps = {
  base: 1,
  md: 2,
}
const DEFAULT_SHAPESHIFT_REVENUES = 100000
const DEFAULT_DEPOSIT_AMOUNT = 14000

type RFOXSimulatorProps = {
  stakingAssetId: AssetId
}

export const RFOXSimulator = ({ stakingAssetId }: RFOXSimulatorProps) => {
  const translate = useTranslate()
  const [shapeShiftRevenue, setShapeShiftRevenue] = useState(DEFAULT_SHAPESHIFT_REVENUES)
  const [depositAmount, setDepositAmount] = useState(DEFAULT_DEPOSIT_AMOUNT)

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const stakingAssetUsdPrice = useAppSelector(state =>
    selectUsdRateByAssetId(state, stakingAssetId),
  )

  const usdcAsset = useAppSelector(state => selectAssetById(state, usdcOnArbitrumOneAssetId))
  const usdcUsdPrice = useAppSelector(state =>
    selectUsdRateByAssetId(state, usdcOnArbitrumOneAssetId),
  )

  const totalStakedCryptoResult = useTotalStakedQuery<string>({
    stakingAssetId,
    select: (totalStaked: bigint) => {
      return BigAmount.fromBaseUnit({
        value: totalStaked.toString(),
        precision: stakingAsset?.precision ?? 0,
      }).toFixed(2)
    },
  })

  const poolShare = useMemo(() => {
    if (!totalStakedCryptoResult.data) return

    return bnOrZero(depositAmount)
      .div(bnOrZero(totalStakedCryptoResult.data).plus(depositAmount))
      .toFixed(4)
  }, [totalStakedCryptoResult.data, depositAmount])

  const { data: epochMetadata } = useCurrentEpochMetadataQuery()

  const estimatedBurn = useMemo(() => {
    if (!epochMetadata) return
    if (!stakingAsset) return
    if (!stakingAssetUsdPrice) return

    return bnOrZero(shapeShiftRevenue).times(epochMetadata.burnRate).toFixed(2)
  }, [epochMetadata, shapeShiftRevenue, stakingAssetUsdPrice, stakingAsset])

  const estimatedRewards = useMemo(() => {
    if (!epochMetadata) return
    if (!poolShare) return
    if (!usdcUsdPrice) return

    const distributionRate =
      epochMetadata.distributionRateByStakingContract[getStakingContract(stakingAssetId)] ?? 0

    return bnOrZero(shapeShiftRevenue).times(distributionRate).times(poolShare).toFixed(2)
  }, [epochMetadata, shapeShiftRevenue, usdcUsdPrice, stakingAssetId, poolShare])

  if (!(usdcAsset && stakingAsset)) return null

  return (
    <Stack
      width='full'
      flexDir={stackFlexDir}
      mx='auto'
      spacing={0}
      borderRadius='2xl'
      overflow='hidden'
    >
      <Card
        data-testid='rfox-simulator'
        flexDir='column'
        borderRadius={0}
        width='full'
        boxShadow='none'
      >
        <CardBody flex='1' p={rfoxSimulatorCardBody}>
          <Heading as='h5' mb={1}>
            {translate('foxPage.rfox.simulateTitle')}
          </Heading>
          <Text color='text.subtle' translation={'foxPage.rfox.simulateSubtle'} />

          <RFOXSliders
            setShapeShiftRevenue={setShapeShiftRevenue}
            shapeShiftRevenue={shapeShiftRevenue}
            setDepositAmount={setDepositAmount}
            depositAmount={depositAmount}
            maxDepositAmount={totalStakedCryptoResult.data}
            stakingAssetId={stakingAssetId}
          />
        </CardBody>
      </Card>
      <Card borderRadius={0} width='full' boxShadow='none'>
        <CardBody p={rfoxSimulatorCardBody}>
          <SimpleGrid columns={columnsProps} spacing={4}>
            <Card>
              <CardBody py={4} px={4}>
                <Text fontSize='md' color='text.subtle' translation='pools.shareOfPool' />
                <Skeleton isLoaded={Boolean(poolShare)}>
                  <Amount.Percent fontSize='24px' value={poolShare} />
                </Skeleton>
              </CardBody>
            </Card>
            <Card>
              <CardBody py={4} px={4}>
                <Text
                  fontSize='md'
                  color='text.subtle'
                  translation='foxPage.rfox.estimatedRewards'
                />

                <Skeleton isLoaded={Boolean(estimatedRewards)}>
                  <Amount.Fiat fontSize='24px' value={estimatedRewards} />
                </Skeleton>
              </CardBody>
            </Card>
            <Card>
              <CardBody py={4} px={4}>
                <Text fontSize='md' color='text.subtle' translation='foxPage.rfox.totalBurn' />

                <Skeleton isLoaded={Boolean(estimatedBurn !== undefined)}>
                  <Amount.Fiat fontSize='24px' value={estimatedBurn} />
                </Skeleton>
              </CardBody>
            </Card>
            <Card>
              <CardBody py={4} px={4}>
                <Text fontSize='md' color='text.subtle' translation='RFOX.timeInPool' />
                <Text fontSize='24px' translation='foxPage.rfox.30days' />
              </CardBody>
            </Card>
          </SimpleGrid>
        </CardBody>
      </Card>
    </Stack>
  )
}
