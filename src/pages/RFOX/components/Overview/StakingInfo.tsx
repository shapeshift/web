import type { FlexProps } from '@chakra-ui/react'
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
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { arbitrumAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { bnOrZero } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { FaArrowRight } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { StakingInfoItem } from './StakingInfoItem'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { HelperTooltip } from '@/components/HelperTooltip/HelperTooltip'
import { Text } from '@/components/Text'
import { fromBaseUnit } from '@/lib/math'
import { formatSecondsToDuration } from '@/lib/utils/time'
import { selectStakingBalance } from '@/pages/RFOX/helpers'
import { useCurrentApyQuery } from '@/pages/RFOX/hooks/useCurrentApyQuery'
import { useCurrentEpochMetadataQuery } from '@/pages/RFOX/hooks/useCurrentEpochMetadataQuery'
import { useCurrentEpochRewardsQuery } from '@/pages/RFOX/hooks/useCurrentEpochRewardsQuery'
import { useLifetimeRewardsQuery } from '@/pages/RFOX/hooks/useLifetimeRewardsQuery'
import { useStakingInfoQuery } from '@/pages/RFOX/hooks/useStakingInfoQuery'
import { useTimeInPoolQuery } from '@/pages/RFOX/hooks/useTimeInPoolQuery'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { tradeInput } from '@/state/slices/tradeInputSlice/tradeInputSlice'
import { store, useAppDispatch, useAppSelector } from '@/state/store'

const gridColumns = { base: 1, md: 2 }

type StakingInfoProps = {
  stakingAssetId: AssetId
  stakingAssetAccountId: AccountId | undefined
}

export const StakingInfo: React.FC<StakingInfoProps> = ({
  stakingAssetId,
  stakingAssetAccountId,
}) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const translate = useTranslate()

  const flexProps = useMemo<FlexProps>(
    () => ({
      flexDir: { base: 'column', md: 'row' },
      gap: 4,
      alignItems: { base: 'flex-start', md: 'center' },
      justifyContent: { base: 'flex-start', md: 'space-between' },
    }),
    [],
  )

  const stakingAsset = useAppSelector(state => selectAssetById(state, stakingAssetId))

  const runeAsset = useAppSelector(state => selectAssetById(state, thorchainAssetId))
  const runeMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, thorchainAssetId),
  )

  const currentApyQuery = useCurrentApyQuery({ stakingAssetId })
  const currentEpochMetadataQuery = useCurrentEpochMetadataQuery()

  const stakingBalanceCryptoBaseUnitQuery = useStakingInfoQuery({
    stakingAssetId,
    accountId: stakingAssetAccountId,
    select: selectStakingBalance,
  })

  const stakingBalanceCryptoPrecision = useMemo(() => {
    if (!stakingBalanceCryptoBaseUnitQuery.data) return
    return fromBaseUnit(stakingBalanceCryptoBaseUnitQuery.data, stakingAsset?.precision ?? 0)
  }, [stakingAsset, stakingBalanceCryptoBaseUnitQuery])

  const currentEpochRewardsCryptoBaseUnitQuery = useCurrentEpochRewardsQuery({
    stakingAssetId,
    stakingAssetAccountId,
    currentEpochMetadata: currentEpochMetadataQuery.data,
  })

  const currentEpochRewardsUserCurrency = useMemo(() => {
    if (!runeAsset) return
    if (currentEpochRewardsCryptoBaseUnitQuery.data === undefined) return

    const currentEpochRewardsCryptoBaseUnit = currentEpochRewardsCryptoBaseUnitQuery.data.toString()

    return bnOrZero(fromBaseUnit(currentEpochRewardsCryptoBaseUnit, runeAsset.precision))
      .times(bnOrZero(runeMarketData?.price))
      .toFixed(2)
  }, [currentEpochRewardsCryptoBaseUnitQuery, runeAsset, runeMarketData])

  const lifetimeRewardsCryptoBaseUnitQuery = useLifetimeRewardsQuery({
    stakingAssetId,
    stakingAssetAccountId,
  })

  const timeInPoolHumanQuery = useTimeInPoolQuery({
    stakingAssetId,
    stakingAssetAccountId,
    select: timeInPoolSeconds =>
      timeInPoolSeconds === 0n ? 'N/A' : formatSecondsToDuration(Number(timeInPoolSeconds)),
  })

  const arbitrumAsset = useAppSelector(state => selectAssetById(state, arbitrumAssetId))

  const handleGetAssetClick = useCallback(
    (assetId: AssetId) => () => {
      const buyAsset = selectAssetById(store.getState(), assetId)
      if (!arbitrumAsset || !buyAsset) return

      navigate(`/trade/${assetId}/${arbitrumAssetId}/0`)

      dispatch(tradeInput.actions.setSellAsset(arbitrumAsset))
      dispatch(tradeInput.actions.setBuyAsset(buyAsset))
      dispatch(tradeInput.actions.setSellAccountId(stakingAssetAccountId))
      dispatch(tradeInput.actions.setBuyAccountId(stakingAssetAccountId))
    },
    [navigate, stakingAssetAccountId, arbitrumAsset, dispatch],
  )

  return (
    <Box>
      <Flex alignItems='center' justifyContent='space-between' mb={6} gap={4} flexWrap='wrap'>
        <Flex alignItems='center' gap={2}>
          <AssetIcon size='sm' assetId={stakingAssetId} key={stakingAssetId} showNetworkIcon />
          <Flex flexDir='column'>
            <CText fontSize='sm'>
              {translate('RFOX.mySymbolPosition', { symbol: stakingAsset?.symbol ?? '' })}
            </CText>
            <Skeleton isLoaded={!stakingBalanceCryptoBaseUnitQuery.isLoading}>
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
            <Flex {...flexProps}>
              <Box>
                <Flex flexDir='column' gap={2}>
                  <HelperTooltip label={translate('RFOX.pendingRewardsBalanceHelper')}>
                    <Text
                      fontSize='sm'
                      color='text.subtle'
                      translation='RFOX.pendingRewardsBalance'
                    />
                  </HelperTooltip>

                  <Box>
                    <Skeleton isLoaded={!currentEpochRewardsCryptoBaseUnitQuery.isLoading}>
                      <Amount.Crypto
                        value={fromBaseUnit(
                          currentEpochRewardsCryptoBaseUnitQuery.data?.toString() ?? '0',
                          runeAsset?.precision ?? 0,
                        )}
                        symbol={runeAsset?.symbol ?? ''}
                        fontSize='xl'
                        fontWeight='medium'
                      />
                      <Amount.Fiat
                        fontSize='xs'
                        value={currentEpochRewardsUserCurrency}
                        color='text.subtle'
                      />
                    </Skeleton>
                  </Box>
                </Flex>
              </Box>
              <Skeleton isLoaded={!currentApyQuery.isLoading}>
                <Tag
                  colorScheme='green'
                  verticalAlign='middle'
                  width='auto'
                  minWidth='100px'
                  justifyContent='center'
                  fontSize='sm'
                >
                  <Amount.Percent
                    width='max-content'
                    prefix='~'
                    value={currentApyQuery.data ?? 0}
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
          amountCryptoBaseUnit={stakingBalanceCryptoBaseUnitQuery.data}
          isLoading={stakingBalanceCryptoBaseUnitQuery.isLoading}
        />
        <StakingInfoItem
          informationDescription={translate('RFOX.lifetimeRewards')}
          helperDescription={translate('RFOX.lifetimeRewardsHelper', {
            symbol: stakingAsset?.symbol,
          })}
          assetId={thorchainAssetId}
          amountCryptoBaseUnit={lifetimeRewardsCryptoBaseUnitQuery.data?.toString()}
          isLoading={lifetimeRewardsCryptoBaseUnitQuery.isLoading}
        />
        <StakingInfoItem
          informationDescription='RFOX.timeInPool'
          helperDescription='RFOX.timeInPoolHelper'
          value={timeInPoolHumanQuery.data ?? 'N/A'}
          isLoading={timeInPoolHumanQuery.isLoading}
        />
      </SimpleGrid>
    </Box>
  )
}
