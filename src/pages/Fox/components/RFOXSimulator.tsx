import type { FlexProps } from '@chakra-ui/react'
import { Card, CardBody, Heading, SimpleGrid, Stack } from '@chakra-ui/react'
import { foxOnArbitrumOneAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { type EpochWithIpfsHash, useEpochHistoryQuery } from 'pages/RFOX/hooks/useEpochHistoryQuery'
import { useTotalStakedQuery } from 'pages/RFOX/hooks/useGetTotalStaked'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { RFOXSliders } from './RFOXSliders'

const stackFlexDir: FlexProps['flexDir'] = { base: 'column', md: 'row' }
const rfoxSimulatorCardBody = { base: 4, md: 8 }
const columnsProps = {
  base: 1,
  md: 2,
}

export const RFOXSimulator = () => {
  const translate = useTranslate()
  const [shapeShiftRevenues, setShapeShiftRevenues] = useState(100000)
  const [foxHolding, setFoxHolding] = useState(14000)

  const foxMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, foxOnArbitrumOneAssetId),
  )
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const stakingAsset = useAppSelector(state => selectAssetById(state, foxOnArbitrumOneAssetId))

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const totalStakedCryptoResult = useTotalStakedQuery<string>({
    select: (totalStaked: bigint) => {
      return bnOrZero(fromBaseUnit(totalStaked.toString(), stakingAsset?.precision ?? 0)).toFixed(2)
    },
  })

  const poolShare = useMemo(() => {
    if (!totalStakedCryptoResult.data) return '0'

    return bnOrZero(foxHolding)
      .div(bnOrZero(totalStakedCryptoResult.data).plus(foxHolding))
      .toFixed(4)
  }, [totalStakedCryptoResult.data, foxHolding])

  const selectLastEpoch = useCallback(
    (data: EpochWithIpfsHash[]): EpochWithIpfsHash | undefined => {
      const lastEpoch = data[data.length - 1]

      return lastEpoch
    },
    [],
  )

  const { data: lastEpoch } = useEpochHistoryQuery({ select: selectLastEpoch })

  const estimatedFoxBurn = useMemo(() => {
    if (!lastEpoch) return '0'
    if (!stakingAsset) return '0'

    return bnOrZero(shapeShiftRevenues)
      .times(lastEpoch.burnRate)
      .div(foxMarketData.price)
      .toFixed(0)
  }, [lastEpoch, shapeShiftRevenues, foxMarketData.price, stakingAsset])

  const estimatedRewards = useMemo(() => {
    if (!lastEpoch) return '0'
    if (!stakingAsset) return '0'

    return bnOrZero(shapeShiftRevenues)
      .times(lastEpoch.distributionRate)
      .times(poolShare)
      .div(runeMarketData.price)
      .toFixed(2)
  }, [lastEpoch, shapeShiftRevenues, runeMarketData.price, stakingAsset, poolShare])

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
            setShapeShiftRevenues={setShapeShiftRevenues}
            shapeShiftRevenues={shapeShiftRevenues}
            setFoxHolding={setFoxHolding}
            foxHolding={foxHolding}
            maxFoxHolding={totalStakedCryptoResult.data}
          />
        </CardBody>
      </Card>
      <Card borderRadius={0} width='full' boxShadow='none'>
        <CardBody p={rfoxSimulatorCardBody}>
          <SimpleGrid columns={columnsProps} spacing={4}>
            <Card>
              <CardBody py={4} px={4}>
                <Text fontSize='md' color='text.subtle' translation='pools.shareOfPool' />
                <Amount.Percent fontSize='24px' value={poolShare} />
              </CardBody>
            </Card>
            <Card>
              <CardBody py={4} px={4}>
                <Text
                  fontSize='md'
                  color='text.subtle'
                  translation='foxPage.rfox.estimatedRewards'
                />
                <Amount.Crypto
                  fontSize='24px'
                  value={estimatedRewards}
                  symbol={runeAsset?.symbol ?? ''}
                />
              </CardBody>
            </Card>
            <Card>
              <CardBody py={4} px={4}>
                <Text fontSize='md' color='text.subtle' translation='foxPage.rfox.totalFoxBurn' />
                <Amount.Crypto
                  fontSize='24px'
                  value={estimatedFoxBurn}
                  symbol={stakingAsset?.symbol ?? ''}
                />
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
