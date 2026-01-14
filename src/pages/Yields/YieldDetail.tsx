import { Box, Button, Container, Flex, Heading, Text } from '@chakra-ui/react'
import { memo, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_VALIDATOR_LOGO,
} from '@/lib/yieldxyz/constants'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import { YieldHero } from '@/pages/Yields/components/YieldHero'
import { YieldManager } from '@/pages/Yields/components/YieldManager'
import { YieldPositionCard } from '@/pages/Yields/components/YieldPositionCard'
import { YieldStats } from '@/pages/Yields/components/YieldStats'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYield } from '@/react-queries/queries/yieldxyz/useYield'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import { selectUserCurrencyToUsdRate } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const SHAPESHIFT_VALIDATOR_NAME = 'ShapeShift DAO'

export const YieldDetail = memo(() => {
  const { yieldId } = useParams<{ yieldId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const translate = useTranslate()
  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const { data: yieldItem, isLoading, error } = useYield(yieldId ?? '')
  const { data: allBalancesData, isFetching: isBalancesFetching } = useAllYieldBalances()
  const balances = yieldItem?.id ? allBalancesData?.normalized[yieldItem.id] : undefined
  const isBalancesLoading = !allBalancesData && isBalancesFetching

  const validatorParam = useMemo(() => searchParams.get('validator'), [searchParams])
  const defaultValidator = useMemo(
    () =>
      yieldItem?.chainId ? DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldItem.chainId] : undefined,
    [yieldItem?.chainId],
  )
  const selectedValidatorAddress = useMemo(
    () => validatorParam || defaultValidator,
    [validatorParam, defaultValidator],
  )

  const isStaking = yieldItem?.mechanics.type === 'staking'
  const shouldFetchValidators = useMemo(
    () => isStaking && yieldItem?.mechanics.requiresValidatorSelection,
    [isStaking, yieldItem?.mechanics.requiresValidatorSelection],
  )
  const { data: validators } = useYieldValidators(yieldItem?.id ?? '', shouldFetchValidators)
  const { data: providers } = useYieldProviders()

  const validatorOrProvider = useMemo(() => {
    if (isStaking && selectedValidatorAddress) {
      const found = validators?.find(v => v.address === selectedValidatorAddress)
      if (found) return { name: found.name, logoURI: found.logoURI }
      if (selectedValidatorAddress === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) {
        return { name: SHAPESHIFT_VALIDATOR_NAME, logoURI: SHAPESHIFT_VALIDATOR_LOGO }
      }
    }
    if (!isStaking && yieldItem && providers) {
      const provider = providers[yieldItem.providerId]
      if (provider) return { name: provider.name, logoURI: provider.logoURI }
    }
    return null
  }, [isStaking, selectedValidatorAddress, validators, yieldItem, providers])

  const userBalances = useMemo(() => {
    if (!balances) return { usd: '0', crypto: '0' }

    const balancesByType = selectedValidatorAddress
      ? balances.byValidatorAddress[selectedValidatorAddress] ?? balances.byType
      : balances.byType

    const activeBalance = balancesByType[YieldBalanceType.Active]
    const enteringBalance = balancesByType[YieldBalanceType.Entering]
    const exitingBalance = balancesByType[YieldBalanceType.Exiting]
    const withdrawableBalance = balancesByType[YieldBalanceType.Withdrawable]

    const totalCrypto = [
      activeBalance,
      enteringBalance,
      exitingBalance,
      withdrawableBalance,
    ].reduce((sum, b) => sum.plus(bnOrZero(b?.aggregatedAmount)), bnOrZero(0))

    const totalUsd = [activeBalance, enteringBalance, exitingBalance, withdrawableBalance].reduce(
      (sum, b) => sum.plus(bnOrZero(b?.aggregatedAmountUsd)),
      bnOrZero(0),
    )

    return {
      usd: totalUsd.times(userCurrencyToUsdRate).toFixed(),
      crypto: totalCrypto.toFixed(),
    }
  }, [balances, selectedValidatorAddress, userCurrencyToUsdRate])

  useEffect(() => {
    if (!yieldId) navigate('/yields')
  }, [yieldId, navigate])

  const isModalOpen = useMemo(() => {
    const modal = searchParams.get('modal')
    return modal === 'yield'
  }, [searchParams])

  const loadingElement = useMemo(
    () => (
      <Container maxW={{ base: 'full', md: 'container.md' }} py={20}>
        <Flex direction='column' gap={8} alignItems='center'>
          <Text color='text.subtle' fontSize='lg'>
            {translate('common.loadingText')}
          </Text>
        </Flex>
      </Container>
    ),
    [translate],
  )

  const errorElement = useMemo(
    () => (
      <Container maxW={{ base: 'full', md: 'container.md' }} py={20}>
        <Box textAlign='center' py={16} bg='background.surface.raised.base' borderRadius='2xl'>
          <Heading as='h2' size='xl' mb={4}>
            {translate('common.error')}
          </Heading>
          <Text color='text.subtle'>
            {error ? String(error) : translate('common.noResultsFound')}
          </Text>
          <Button mt={8} onClick={() => navigate('/yields')} size='lg'>
            {translate('common.back')}
          </Button>
        </Box>
      </Container>
    ),
    [error, navigate, translate],
  )

  if (isLoading) return loadingElement
  if (error || !yieldItem) return errorElement

  return (
    <Box bg='background.surface.base' minH='100vh' pb={20}>
      <Container
        maxW={{ base: 'full', md: 'container.md', lg: 'container.lg' }}
        px={{ base: 4, md: 8, lg: 12 }}
      >
        <YieldHero
          yieldItem={yieldItem}
          userBalanceUsd={userBalances.usd}
          userBalanceCrypto={userBalances.crypto}
          validatorOrProvider={validatorOrProvider}
        />

        <Flex direction='column' gap={4} mt={6}>
          <YieldPositionCard
            yieldItem={yieldItem}
            balances={balances}
            isBalancesLoading={isBalancesLoading}
          />
          <YieldStats yieldItem={yieldItem} balances={balances} />
        </Flex>
      </Container>

      {isModalOpen && <YieldManager />}
    </Box>
  )
})
