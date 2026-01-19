import {
  Avatar,
  Card,
  CardBody,
  Flex,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/react'
import { memo, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSearchParams } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { Row } from '@/components/Row/Row'
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
  variant?: 'list' | 'card'
}

export const YieldStats = memo(({ yieldItem, balances, variant = 'card' }: YieldStatsProps) => {
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
  }, [yieldItem.id, defaultValidator, validatorParam])

  const selectedValidator = useMemo(() => {
    if (!selectedValidatorAddress) return undefined
    const inList = validators?.find(v => v.address === selectedValidatorAddress)
    if (inList) return inList
    const inBalances = balances?.raw.find(b => b.validator?.address === selectedValidatorAddress)
      ?.validator
    if (inBalances) return inBalances
    return undefined
  }, [selectedValidatorAddress, validators, balances?.raw])

  const validatorTvl = useMemo(() => {
    return selectedValidator && 'tvl' in selectedValidator ? selectedValidator.tvl : undefined
  }, [selectedValidator])

  const tvl = useMemo(() => {
    return bnOrZero(yieldItem.statistics?.tvl ?? validatorTvl).toNumber()
  }, [yieldItem.statistics?.tvl, validatorTvl])

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

  if (variant === 'list') {
    return (
      <Card>
        <CardBody display='flex' flexDirection='column'>
          <Row py={4} borderColor='border.base'>
            <Row.Label>{translate('yieldXYZ.tvl')}</Row.Label>
            <Row.Value>
              <Amount.Fiat value={tvlUserCurrency} abbreviated />
            </Row.Value>
          </Row>
          <Row borderTopWidth='1px' py={4} borderColor='border.base'>
            <Row.Label>{translate('yieldXYZ.rewardSchedule')}</Row.Label>
            <Row.Value textTransform='capitalize'>{yieldItem.mechanics.rewardSchedule}</Row.Value>
          </Row>
          <Row borderTopWidth='1px' py={4} borderColor='border.base'>
            <Row.Label>{translate('yieldXYZ.type')}</Row.Label>
            <Row.Value textTransform='capitalize'>{yieldItem.mechanics.type}</Row.Value>
          </Row>
          {validatorMetadata && (
            <Row borderTopWidth='1px' py={4} borderColor='border.base'>
              <Row.Label>{translate('yieldXYZ.validator')}</Row.Label>
              <Row.Value textTransform='capitalize'>{validatorMetadata?.name}</Row.Value>
            </Row>
          )}
        </CardBody>
      </Card>
    )
  }

  return (
    <SimpleGrid columns={{ base: 2, md: validatorMetadata ? 4 : 3 }} spacing={4}>
      <Card>
        <CardBody>
          <Stat>
            <StatLabel color='text.subtle' fontSize='xs' textTransform='uppercase'>
              {translate('yieldXYZ.tvl')}
            </StatLabel>
            <StatNumber fontSize='md'>
              <Amount.Fiat value={tvlUserCurrency} abbreviated />
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stat>
            <StatLabel color='text.subtle' fontSize='xs' textTransform='uppercase'>
              {translate('yieldXYZ.rewardSchedule')}
            </StatLabel>
            <StatNumber fontSize='md' textTransform='capitalize'>
              {yieldItem.mechanics.rewardSchedule}
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <Stat>
            <StatLabel color='text.subtle' fontSize='xs' textTransform='uppercase'>
              {translate('yieldXYZ.type')}
            </StatLabel>
            <StatNumber fontSize='md' textTransform='capitalize'>
              {yieldItem.mechanics.type}
            </StatNumber>
          </Stat>
        </CardBody>
      </Card>

      {validatorMetadata && (
        <Card>
          <CardBody>
            <Stat>
              <StatLabel color='text.subtle' fontSize='xs' textTransform='uppercase'>
                {translate('yieldXYZ.validator')}
              </StatLabel>
              <StatNumber fontSize='md'>
                <Flex align='center' gap={1}>
                  {validatorMetadata.logoURI && (
                    <Avatar
                      size='2xs'
                      src={validatorMetadata.logoURI}
                      name={validatorMetadata.name}
                    />
                  )}
                  {validatorMetadata.name}
                </Flex>
              </StatNumber>
            </Stat>
          </CardBody>
        </Card>
      )}
    </SimpleGrid>
  )
})
