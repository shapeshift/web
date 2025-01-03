import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Icon,
  SimpleGrid,
  Skeleton,
  Tag,
  Text as CText,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { thorchainAssetId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { FaArrowRight } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { formatSecondsToDuration } from 'lib/utils/time'
import { useCurrentApyQuery } from 'pages/RFOX/hooks/useCurrentApyQuery'
import { useCurrentEpochMetadataQuery } from 'pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { useCurrentEpochRewardsQuery } from 'pages/RFOX/hooks/useCurrentEpochRewardsQuery'
import { useLifetimeRewardsQuery } from 'pages/RFOX/hooks/useLifetimeRewardsQuery'
import { useTimeInPoolQuery } from 'pages/RFOX/hooks/useTimeInPoolQuery'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingInfoItem } from './StakingInfoItem'

const gridColumns = { base: 1, md: 2 }

type StakingInfoProps = {
  stakingAssetId: AssetId
  stakingAssetAccountAddress: string | undefined
  stakingBalanceCryptoBaseUnit: string | undefined
  isStakingBalanceCryptoBaseUnitLoading: boolean
}

const pairProps = {
  showFirst: true,
}

export const StakingInfo: React.FC<StakingInfoProps> = ({
  stakingAssetId,
  stakingAssetAccountAddress,
  stakingBalanceCryptoBaseUnit,
  isStakingBalanceCryptoBaseUnitLoading,
}) => {
  const history = useHistory()
  const translate = useTranslate()
  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const thorchainAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const {
    data: apy,
    isLoading: isApyQueryLoading,
    isFetching: isApyFetching,
  } = useCurrentApyQuery({ stakingAssetId })

  const isApyLoading = useMemo(() => {
    return isApyQueryLoading || isApyFetching
  }, [isApyQueryLoading, isApyFetching])

  const stakingBalanceCryptoPrecision = useMemo(() => {
    if (!stakingBalanceCryptoBaseUnit) return
    return fromBaseUnit(stakingBalanceCryptoBaseUnit, stakingAsset?.precision ?? 0)
  }, [stakingAsset, stakingBalanceCryptoBaseUnit])

  const currentEpochMetadataResult = useCurrentEpochMetadataQuery()

  // @TODO: Add stakingAssetId to useCurrentEpochRewardsQuery
  const currentEpochRewardsCryptoBaseUnitResult = useCurrentEpochRewardsQuery({
    stakingAssetAccountAddress,
    currentEpochMetadata: currentEpochMetadataResult.data,
  })

  // @TODO: Add stakingAssetId to lifetimeRewardsQuery
  const lifetimeRewardsCryptoBaseUnitResult = useLifetimeRewardsQuery({
    stakingAssetAccountAddress,
  })

  const timeInPoolHumanResult = useTimeInPoolQuery({
    stakingAssetAccountAddress,
    stakingAssetId,
    select: timeInPoolSeconds =>
      timeInPoolSeconds === 0n ? 'N/A' : formatSecondsToDuration(Number(timeInPoolSeconds)),
  })

  const handleGetAssetClick = useCallback(
    (assetId: AssetId) => {
      history.push(`/trade/${assetId}`)
    },
    [history],
  )

  return (
    <Box>
      <Flex alignItems='center' justifyContent='space-between' mb={6}>
        <Flex alignItems='center' gap={2}>
          <AssetIcon
            size='sm'
            assetId={stakingAssetId}
            key={stakingAssetId}
            showNetworkIcon
            pairProps={pairProps}
          />
          <Flex flexDir='column'>
            <CText fontSize='sm'>
              {translate('RFOX.mySymbolPosition', { symbol: stakingAsset?.symbol ?? '' })}
            </CText>
            <Skeleton isLoaded={!isStakingBalanceCryptoBaseUnitLoading}>
              {stakingBalanceCryptoPrecision === '0' ? (
                <Button
                  // eslint-disable-next-line react-memo/require-usememo
                  onClick={() => handleGetAssetClick(stakingAssetId)}
                  size='xs'
                  fontWeight='medium'
                  variant='link'
                  colorScheme='blue'
                >
                  {translate('plugins.foxPage.getAsset', {
                    assetSymbol: stakingAsset?.symbol ?? '',
                  })}
                  <Icon as={FaArrowRight} ml={2} />
                </Button>
              ) : (
                <Amount.Crypto
                  fontWeight='bold'
                  fontSize='md'
                  color='text.subtle'
                  value={stakingBalanceCryptoPrecision}
                  symbol={stakingAsset?.symbol ?? ''}
                />
              )}
            </Skeleton>
          </Flex>
        </Flex>

        <Card width='100%' maxWidth='400px'>
          <CardBody py={4} px={4}>
            <Flex alignItems='center' justifyContent='space-between'>
              <Box width='100%'>
                <Text fontSize='sm' color='text.subtle' translation='RFOX.pendingRewardsBalance' />

                <Skeleton
                  isLoaded={
                    !Boolean(
                      currentEpochRewardsCryptoBaseUnitResult.isLoading ||
                        currentEpochRewardsCryptoBaseUnitResult.isFetching,
                    )
                  }
                >
                  <Amount.Crypto
                    value={fromBaseUnit(
                      currentEpochRewardsCryptoBaseUnitResult.data?.toString() ?? '0',
                      thorchainAsset?.precision ?? 0,
                    )}
                    symbol={thorchainAsset?.symbol ?? ''}
                    fontSize='xl'
                    fontWeight='medium'
                  />
                </Skeleton>
              </Box>
              <Skeleton isLoaded={!Boolean(isApyLoading)} ml={2}>
                <Tag colorScheme='green' verticalAlign='middle'>
                  <Amount.Percent width='max-content' prefix='~' value={apy ?? 0} suffix='APY' />
                </Tag>
              </Skeleton>
            </Flex>
          </CardBody>
        </Card>
      </Flex>

      <Text mb={6} translation='RFOX.positionDetails' />
      <SimpleGrid spacing={6} columns={gridColumns}>
        <StakingInfoItem
          informationDescription='RFOX.myStakedBalance'
          helperTranslation='RFOX.myStakedBalanceHelper'
          assetId={stakingAssetId}
          amountCryptoBaseUnit={stakingBalanceCryptoBaseUnit}
          isLoading={isStakingBalanceCryptoBaseUnitLoading}
        />
        <StakingInfoItem
          informationDescription='RFOX.lifetimeRewards'
          helperTranslation='RFOX.lifetimeRewardsHelper'
          assetId={thorchainAssetId}
          amountCryptoBaseUnit={lifetimeRewardsCryptoBaseUnitResult.data?.toString()}
          isLoading={
            lifetimeRewardsCryptoBaseUnitResult.isLoading ||
            lifetimeRewardsCryptoBaseUnitResult.isFetching
          }
        />
        <StakingInfoItem
          informationDescription='RFOX.timeInPool'
          helperTranslation='RFOX.timeInPoolHelper'
          value={timeInPoolHumanResult.data ?? 'N/A'}
          isLoading={timeInPoolHumanResult.isLoading || timeInPoolHumanResult.isFetching}
        />
      </SimpleGrid>
    </Box>
  )
}
