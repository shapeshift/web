import type { FlexProps } from '@chakra-ui/react'
import { Card, CardBody, Heading, SimpleGrid, Skeleton, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { getStakingContract, selectLastEpoch } from 'pages/RFOX/helpers'
import { useEpochHistoryQuery } from 'pages/RFOX/hooks/useEpochHistoryQuery'
import { useTotalStakedQuery } from 'pages/RFOX/hooks/useGetTotalStaked'
import { selectAssetById, selectUsdRateByAssetId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { RFOXSliders } from './RFOXSliders'

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

  const stakingAssetUsdPrice = useAppSelector(state =>
    selectUsdRateByAssetId(state, stakingAssetId),
  )
  const runeUsdPrice = useAppSelector(state => selectUsdRateByAssetId(state, thorchainAssetId))

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const totalStakedCryptoResult = useTotalStakedQuery<string>({
    stakingAssetId,
    select: (totalStaked: bigint) => {
      return bnOrZero(fromBaseUnit(totalStaked.toString(), stakingAsset?.precision ?? 0)).toFixed(2)
    },
  })

  const poolShare = useMemo(() => {
    if (!totalStakedCryptoResult.data) return

    return bnOrZero(depositAmount)
      .div(bnOrZero(totalStakedCryptoResult.data).plus(depositAmount))
      .toFixed(4)
  }, [totalStakedCryptoResult.data, depositAmount])

  const { data: lastEpoch } = useEpochHistoryQuery({ select: selectLastEpoch })

  const estimatedFoxBurn = useMemo(() => {
    if (!lastEpoch) return
    if (!stakingAsset) return
    if (!stakingAssetUsdPrice) return

    return bnOrZero(shapeShiftRevenue)
      .times(lastEpoch.burnRate)
      .div(stakingAssetUsdPrice)
      .toFixed(0)
  }, [lastEpoch, shapeShiftRevenue, stakingAssetUsdPrice, stakingAsset])

  const estimatedRewards = useMemo(() => {
    if (!lastEpoch) return
    if (!poolShare) return
    if (!runeUsdPrice) return

    const distributionRate =
      lastEpoch.detailsByStakingContract[getStakingContract(stakingAssetId)].distributionRate

    return bnOrZero(shapeShiftRevenue)
      .times(distributionRate)
      .times(poolShare)
      .div(runeUsdPrice)
      .toFixed(2)
  }, [lastEpoch, shapeShiftRevenue, runeUsdPrice, stakingAssetId, poolShare])

  if (!(runeAsset && stakingAsset)) return null

  return (
    <Stack
      width='full'
      flexDir={stackFlexDir}
      mx='auto'
      spacing={0}
      borderRadius='2xl'
      overflow='hidden'
    >
      <Card flexDir='column' borderRadius={0} width='full' boxShadow='none'>
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
                  <Amount.Crypto
                    fontSize='24px'
                    value={estimatedRewards}
                    symbol={runeAsset.symbol ?? ''}
                  />
                </Skeleton>
              </CardBody>
            </Card>
            <Card>
              <CardBody py={4} px={4}>
                <Text fontSize='md' color='text.subtle' translation='foxPage.rfox.totalFoxBurn' />

                <Skeleton isLoaded={Boolean(estimatedFoxBurn !== undefined)}>
                  <Amount.Crypto
                    fontSize='24px'
                    value={estimatedFoxBurn}
                    symbol={stakingAsset.symbol ?? ''}
                  />
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
