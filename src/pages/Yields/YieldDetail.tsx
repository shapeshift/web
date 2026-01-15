import { Box, Button, Container, Flex, Heading, Text } from '@chakra-ui/react'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { AccountSelector } from '@/components/AccountSelector/AccountSelector'
import { Display } from '@/components/Display'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  COSMOS_ATOM_NATIVE_STAKING_YIELD_ID,
  DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID,
  FIGMENT_SOLANA_VALIDATOR_ADDRESS,
  FIGMENT_VALIDATOR_LOGO,
  FIGMENT_VALIDATOR_NAME,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_VALIDATOR_LOGO,
  SHAPESHIFT_VALIDATOR_NAME,
  SOLANA_SOL_NATIVE_MULTIVALIDATOR_STAKING_YIELD_ID,
} from '@/lib/yieldxyz/constants'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import { YieldHero } from '@/pages/Yields/components/YieldHero'
import { YieldManager } from '@/pages/Yields/components/YieldManager'
import { YieldPositionCard } from '@/pages/Yields/components/YieldPositionCard'
import { YieldStats } from '@/pages/Yields/components/YieldStats'
import { useYieldAccount } from '@/pages/Yields/YieldAccountContext'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYield } from '@/react-queries/queries/yieldxyz/useYield'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import {
  selectPortfolioAccountIdsByAssetIdFilter,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const YieldDetail = memo(() => {
  const { yieldId } = useParams<{ yieldId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const accountIdParam = useMemo(() => searchParams.get('accountId') ?? undefined, [searchParams])
  const navigate = useNavigate()
  const translate = useTranslate()

  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)
  const { accountId, setAccountId } = useYieldAccount()

  const handleAccountChange = useCallback(
    (newAccountId: string) => {
      setAccountId(newAccountId)
    },
    [setAccountId],
  )

  const { data: yieldItem, isLoading, error } = useYield(yieldId ?? '')

  const selectorAssetId = useMemo(() => {
    if (yieldItem?.token.assetId) return yieldItem.token.assetId
    if (yieldItem?.inputTokens?.[0]?.assetId) return yieldItem.inputTokens[0].assetId
    return undefined
  }, [yieldItem?.inputTokens, yieldItem?.token.assetId])

  const availableAccounts = useAppSelector(state =>
    selectorAssetId
      ? selectPortfolioAccountIdsByAssetIdFilter(state, { assetId: selectorAssetId })
      : [],
  )

  const selectedAccountId = useMemo(() => {
    if (accountId && availableAccounts.includes(accountId)) return accountId
    if (accountIdParam && availableAccounts.includes(accountIdParam)) return accountIdParam
    return availableAccounts[0]
  }, [accountId, accountIdParam, availableAccounts])

  const balanceAccountIds = useMemo(
    () => (selectedAccountId ? [selectedAccountId] : undefined),
    [selectedAccountId],
  )
  const { data: allBalancesData, isFetching: isBalancesFetching } = useAllYieldBalances({
    accountIds: balanceAccountIds,
  })
  const balances = yieldItem?.id ? allBalancesData?.normalized[yieldItem.id] : undefined
  const isBalancesLoading = !allBalancesData && isBalancesFetching

  const isYieldMultiAccountEnabled = useFeatureFlag('YieldMultiAccount')

  useEffect(() => {
    if (!selectedAccountId) return
    if (accountId === selectedAccountId) return
    setAccountId(selectedAccountId)
  }, [accountId, selectedAccountId, setAccountId])

  useEffect(() => {
    if (!selectedAccountId) return
    const next = new URLSearchParams(searchParams)
    if (next.get('accountId') === selectedAccountId) return
    next.set('accountId', selectedAccountId)
    setSearchParams(next, { replace: true })
  }, [selectedAccountId, searchParams, setSearchParams])

  const showAccountSelector = isYieldMultiAccountEnabled && availableAccounts.length > 1

  const validatorParam = useMemo(() => searchParams.get('validator'), [searchParams])
  const defaultValidator = useMemo(
    () =>
      yieldItem?.chainId ? DEFAULT_NATIVE_VALIDATOR_BY_CHAIN_ID[yieldItem.chainId] : undefined,
    [yieldItem?.chainId],
  )
  const selectedValidatorAddress = useMemo(() => {
    // For native staking with hardcoded defaults, always use the default validator (ignore URL param)
    if (
      yieldId === COSMOS_ATOM_NATIVE_STAKING_YIELD_ID ||
      yieldId === SOLANA_SOL_NATIVE_MULTIVALIDATOR_STAKING_YIELD_ID ||
      (yieldId?.includes('solana') && yieldId?.includes('native'))
    ) {
      return defaultValidator
    }
    return validatorParam || defaultValidator
  }, [yieldId, validatorParam, defaultValidator])

  const isStaking = yieldItem?.mechanics.type === 'staking'
  const shouldFetchValidators = useMemo(
    () => isStaking && yieldItem?.mechanics.requiresValidatorSelection,
    [isStaking, yieldItem?.mechanics.requiresValidatorSelection],
  )
  const { data: validators } = useYieldValidators(yieldItem?.id ?? '', shouldFetchValidators)
  const { data: yieldProviders } = useYieldProviders()

  const validatorOrProvider = useMemo(() => {
    if (isStaking && selectedValidatorAddress) {
      const found = validators?.find(v => v.address === selectedValidatorAddress)
      if (found) return { name: found.name, logoURI: found.logoURI }
      if (selectedValidatorAddress === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) {
        return { name: SHAPESHIFT_VALIDATOR_NAME, logoURI: SHAPESHIFT_VALIDATOR_LOGO }
      }
      if (selectedValidatorAddress === FIGMENT_SOLANA_VALIDATOR_ADDRESS) {
        return { name: FIGMENT_VALIDATOR_NAME, logoURI: FIGMENT_VALIDATOR_LOGO }
      }
    }
    if (!isStaking && yieldItem) {
      const provider = yieldProviders?.[yieldItem.providerId]
      if (provider) return { name: provider.name, logoURI: provider.logoURI }
    }
    return null
  }, [isStaking, selectedValidatorAddress, validators, yieldItem, yieldProviders])

  const titleOverride = useMemo(() => {
    if (!yieldItem) return undefined
    const isNativeStaking =
      yieldItem.mechanics.type === 'staking' && yieldItem.mechanics.requiresValidatorSelection
    if (isNativeStaking) return translate('yieldXYZ.nativeStaking')
    // For non-native staking, use token symbol (consistent with cards)
    return yieldItem.token.symbol
  }, [yieldItem, translate])

  const userBalances = useMemo(() => {
    if (!balances) return { userCurrency: '0', crypto: '0' }

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
      userCurrency: totalUsd.times(userCurrencyToUsdRate).toFixed(),
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
        {showAccountSelector && selectorAssetId && (
          <>
            <Display.Desktop>
              <Flex justifyContent='flex-end' pt={4}>
                <AccountSelector
                  assetId={selectorAssetId}
                  accountId={accountId}
                  onChange={handleAccountChange}
                />
              </Flex>
            </Display.Desktop>
            <Display.Mobile>
              <Box pt={2} pb={2}>
                <AccountSelector
                  assetId={selectorAssetId}
                  accountId={accountId}
                  onChange={handleAccountChange}
                />
              </Box>
            </Display.Mobile>
          </>
        )}
        <YieldHero
          yieldItem={yieldItem}
          userBalanceUsd={userBalances.userCurrency}
          userBalanceCrypto={userBalances.crypto}
          validatorOrProvider={validatorOrProvider}
          titleOverride={titleOverride}
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
