import { Avatar, Box, Card, CardBody, Flex, SimpleGrid, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSearchParams } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { getDefaultValidatorForYield, isStakingYieldType } from '@/lib/yieldxyz/utils'
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
    () => getDefaultValidatorForYield(yieldItem.id) ?? validators?.[0]?.address,
    [yieldItem.id, validators],
  )

  const selectedValidatorAddress = useMemo(() => {
    const enforced = getDefaultValidatorForYield(yieldItem.id)
    if (enforced) return enforced
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
    <Card>
      <CardBody>
        <SimpleGrid columns={3} spacing={4}>
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
                  <Avatar
                    size='2xs'
                    src={validatorMetadata.logoURI}
                    name={validatorMetadata.name}
                  />
                )}
                <Text fontSize='sm' fontWeight='bold'>
                  {validatorMetadata.name}
                </Text>
              </Flex>
            </Box>
          )}
        </SimpleGrid>
      </CardBody>
    </Card>
  )
})
