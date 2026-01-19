import { Avatar, Box, Flex, SimpleGrid, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSearchParams } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  COSMOS_ATOM_NATIVE_STAKING_YIELD_ID,
  DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID,
  SOLANA_SOL_NATIVE_MULTIVALIDATOR_STAKING_YIELD_ID,
} from '@/lib/yieldxyz/constants'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { isStakingYieldType } from '@/lib/yieldxyz/utils'
import type { NormalizedYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type YieldStatsProps = {
  yieldItem: AugmentedYieldDto
  balances?: NormalizedYieldBalances
}

export const YieldStats = memo(({ yieldItem, balances }: YieldStatsProps) => {
  const translate = useTranslate()
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const inputTokenAssetId = yieldItem.inputTokens[0]?.assetId ?? ''
  const inputTokenMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, inputTokenAssetId),
  )

  const [searchParams] = useSearchParams()
  const validatorParam = searchParams.get('validator')

  const isStaking = isStakingYieldType(yieldItem.mechanics.type)
  const shouldFetchValidators = isStaking && yieldItem.mechanics.requiresValidatorSelection
  const { data: validators } = useYieldValidators(yieldItem.id, shouldFetchValidators)

  const defaultValidator = useMemo(
    () =>
      yieldItem.chainId && DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldItem.chainId]
        ? DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldItem.chainId]
        : validators?.[0]?.address,
    [yieldItem.chainId, validators],
  )

  const selectedValidatorAddress = useMemo(() => {
    if (
      yieldItem.id === COSMOS_ATOM_NATIVE_STAKING_YIELD_ID ||
      yieldItem.id === SOLANA_SOL_NATIVE_MULTIVALIDATOR_STAKING_YIELD_ID ||
      (yieldItem.id.includes('solana') && yieldItem.id.includes('native'))
    ) {
      return defaultValidator
    }
    return validatorParam || defaultValidator
  }, [yieldItem.id, validatorParam, defaultValidator])

  const selectedValidator = useMemo(() => {
    if (!selectedValidatorAddress) return undefined
    const inList = validators?.find(v => v.address === selectedValidatorAddress)
    if (inList) return inList
    const inBalances = balances?.raw.find(b => b.validator?.address === selectedValidatorAddress)
      ?.validator
    if (inBalances) return inBalances
    return undefined
  }, [selectedValidatorAddress, validators, balances?.raw])

  const tvl = useMemo(() => {
    const validatorTvl =
      selectedValidator && 'tvl' in selectedValidator ? selectedValidator.tvl : undefined
    return bnOrZero(yieldItem.statistics?.tvl ?? validatorTvl).toNumber()
  }, [selectedValidator, yieldItem.statistics?.tvl])

  const tvlUserCurrency = useMemo(
    () =>
      yieldItem.statistics?.tvlUsd
        ? bnOrZero(yieldItem.statistics.tvlUsd).times(userCurrencyToUsdRate).toFixed()
        : bnOrZero(tvl)
            .times(bnOrZero(inputTokenMarketData?.price))
            .toFixed(),
    [yieldItem.statistics?.tvlUsd, userCurrencyToUsdRate, tvl, inputTokenMarketData?.price],
  )

  const validatorMetadata = useMemo(
    () =>
      isStaking && selectedValidator
        ? { name: selectedValidator.name, logoURI: selectedValidator.logoURI }
        : null,
    [isStaking, selectedValidator],
  )

  return (
    <SimpleGrid columns={3} spacing={4} px={{ base: 2, md: 0 }}>
      <Box>
        <Text fontSize='xs' color='text.subtle' textTransform='uppercase' mb={1}>
          {translate('yieldXYZ.tvl')}
        </Text>
        <Amount.Fiat value={tvlUserCurrency} abbreviated fontSize='sm' fontWeight='bold' />
      </Box>

      <Box>
        <Text fontSize='xs' color='text.subtle' textTransform='uppercase' mb={1}>
          {translate('yieldXYZ.rewardSchedule')}
        </Text>
        <Text fontSize='sm' fontWeight='bold' textTransform='capitalize'>
          {yieldItem.mechanics.rewardSchedule}
        </Text>
      </Box>

      <Box>
        <Text fontSize='xs' color='text.subtle' textTransform='uppercase' mb={1}>
          {translate('yieldXYZ.type')}
        </Text>
        <Text fontSize='sm' fontWeight='bold' textTransform='capitalize'>
          {yieldItem.mechanics.type}
        </Text>
      </Box>

      {validatorMetadata && (
        <Box>
          <Text fontSize='xs' color='text.subtle' textTransform='uppercase' mb={1}>
            {translate('yieldXYZ.validator')}
          </Text>
          <Flex align='center' gap={1}>
            {validatorMetadata.logoURI && (
              <Avatar size='2xs' src={validatorMetadata.logoURI} name={validatorMetadata.name} />
            )}
            <Text fontSize='sm' fontWeight='bold'>
              {validatorMetadata.name}
            </Text>
          </Flex>
        </Box>
      )}
    </SimpleGrid>
  )
})
