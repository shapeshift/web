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
import { HelperTooltip } from 'components/HelperTooltip/HelperTooltip'
import { Text } from 'components/Text'
import { fromBaseUnit } from 'lib/math'
import { formatSecondsToDuration } from 'lib/utils/time'
import { selectStakingBalance } from 'pages/RFOX/helpers'
import { useCurrentApyQuery } from 'pages/RFOX/hooks/useCurrentApyQuery'
import { useCurrentEpochMetadataQuery } from 'pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { useCurrentEpochRewardsQuery } from 'pages/RFOX/hooks/useCurrentEpochRewardsQuery'
import { useLifetimeRewardsQuery } from 'pages/RFOX/hooks/useLifetimeRewardsQuery'
import { useStakingInfoQuery } from 'pages/RFOX/hooks/useStakingInfoQuery'
import { useTimeInPoolQuery } from 'pages/RFOX/hooks/useTimeInPoolQuery'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { StakingInfoItem } from './StakingInfoItem'

const gridColumns = { base: 1, md: 2 }

type StakingInfoProps = {
  stakingAssetId: AssetId
  stakingAssetAccountAddress: string | undefined
}

const pairProps = {
  showFirst: true,
}

export const StakingInfo: React.FC<StakingInfoProps> = ({
  stakingAssetId,
  stakingAssetAccountAddress,
}) => {
  const history = useHistory()
  const translate = useTranslate()

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))
  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))

  const currentApyResult = useCurrentApyQuery({ stakingAssetId })
  const currentEpochMetadataResult = useCurrentEpochMetadataQuery()

  const stakingBalanceCryptoBaseUnitResult = useStakingInfoQuery({
    stakingAssetId,
    stakingAssetAccountAddress,
    select: selectStakingBalance,
  })

  const stakingBalanceCryptoPrecision = useMemo(() => {
    if (!stakingBalanceCryptoBaseUnitResult.data) return
    return fromBaseUnit(stakingBalanceCryptoBaseUnitResult.data, stakingAsset?.precision ?? 0)
  }, [stakingAsset, stakingBalanceCryptoBaseUnitResult])

  const currentEpochRewardsCryptoBaseUnitResult = useCurrentEpochRewardsQuery({
    stakingAssetId,
    stakingAssetAccountAddress,
    currentEpochMetadata: currentEpochMetadataResult.data,
  })

  const lifetimeRewardsCryptoBaseUnitResult = useLifetimeRewardsQuery({
    stakingAssetId,
    stakingAssetAccountAddress,
  })

  const timeInPoolHumanResult = useTimeInPoolQuery({
    stakingAssetId,
    stakingAssetAccountAddress,
    select: timeInPoolSeconds =>
      timeInPoolSeconds === 0n ? 'N/A' : formatSecondsToDuration(Number(timeInPoolSeconds)),
  })

  const handleGetAssetClick = useCallback(
    (assetId: AssetId) => () => {
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
            <Skeleton isLoaded={!stakingBalanceCryptoBaseUnitResult.isLoading}>
              {stakingBalanceCryptoPrecision === '0' ? (
                <Button
                  onClick={handleGetAssetClick(stakingAssetId)}
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
                <HelperTooltip label={translate('RFOX.pendingRewardsBalanceHelper')}>
                  <Text
                    fontSize='sm'
                    color='text.subtle'
                    translation='RFOX.pendingRewardsBalance'
                  />
                </HelperTooltip>
                <Skeleton isLoaded={!currentEpochRewardsCryptoBaseUnitResult.isLoading}>
                  <Amount.Crypto
                    value={fromBaseUnit(
                      currentEpochRewardsCryptoBaseUnitResult.data?.toString() ?? '0',
                      runeAsset?.precision ?? 0,
                    )}
                    symbol={runeAsset?.symbol ?? ''}
                    fontSize='xl'
                    fontWeight='medium'
                  />
                </Skeleton>
              </Box>
              <Skeleton isLoaded={!currentApyResult.isLoading} ml={2}>
                <Tag colorScheme='green' verticalAlign='middle'>
                  <Amount.Percent
                    width='max-content'
                    prefix='~'
                    value={currentApyResult.data ?? 0}
                    suffix='APY'
                  />
                </Tag>
              </Skeleton>
            </Flex>
          </CardBody>
        </Card>
      </Flex>

      <Text mb={6} translation='RFOX.positionDetails' />
      <SimpleGrid spacing={6} columns={gridColumns}>
        <StakingInfoItem
          informationDescription={translate('RFOX.myStakedBalance')}
          helperDescription={translate('RFOX.myStakedBalanceHelper', {
            symbol: stakingAsset?.symbol,
          })}
          assetId={stakingAssetId}
          amountCryptoBaseUnit={stakingBalanceCryptoBaseUnitResult.data}
          isLoading={stakingBalanceCryptoBaseUnitResult.isLoading}
        />
        <StakingInfoItem
          informationDescription={translate('RFOX.lifetimeRewards')}
          helperDescription={translate('RFOX.lifetimeRewardsHelper', {
            symbol: stakingAsset?.symbol,
          })}
          assetId={thorchainAssetId}
          amountCryptoBaseUnit={lifetimeRewardsCryptoBaseUnitResult.data?.toString()}
          isLoading={lifetimeRewardsCryptoBaseUnitResult.isLoading}
        />
        <StakingInfoItem
          informationDescription='RFOX.timeInPool'
          helperDescription='RFOX.timeInPoolHelper'
          value={timeInPoolHumanResult.data ?? 'N/A'}
          isLoading={timeInPoolHumanResult.isLoading}
        />
      </SimpleGrid>
    </Box>
  )
}
