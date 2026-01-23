import { ArrowBackIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import { Box, Button, Container, Flex, Heading, IconButton, Stack, Text } from '@chakra-ui/react'
import type { Property } from 'csstype'
import { memo, useCallback, useEffect, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { AccountSelector } from '@/components/AccountSelector/AccountSelector'
import { Display } from '@/components/Display'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import {
  FIGMENT_SOLANA_VALIDATOR_ADDRESS,
  FIGMENT_VALIDATOR_LOGO,
  FIGMENT_VALIDATOR_NAME,
  SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS,
  SHAPESHIFT_VALIDATOR_LOGO,
  SHAPESHIFT_VALIDATOR_NAME,
} from '@/lib/yieldxyz/constants'
import { getYieldDisplayName } from '@/lib/yieldxyz/getYieldDisplayName'
import { YieldBalanceType } from '@/lib/yieldxyz/types'
import { getDefaultValidatorForYield } from '@/lib/yieldxyz/utils'
import { YieldAvailableToDeposit } from '@/pages/Yields/components/YieldAvailableToDeposit'
import { YieldHero } from '@/pages/Yields/components/YieldHero'
import { YieldInfoCard } from '@/pages/Yields/components/YieldInfoCard'
import { YieldManager } from '@/pages/Yields/components/YieldManager'
import { YieldPositionCard } from '@/pages/Yields/components/YieldPositionCard'
import { YieldProviderInfo } from '@/pages/Yields/components/YieldProviderInfo'
import { YieldRelatedMarkets } from '@/pages/Yields/components/YieldRelatedMarkets'
import { YieldStats } from '@/pages/Yields/components/YieldStats'
import { useYieldAccountSync } from '@/pages/Yields/hooks/useYieldAccountSync'
import { useAllYieldBalances } from '@/react-queries/queries/yieldxyz/useAllYieldBalances'
import { useYield } from '@/react-queries/queries/yieldxyz/useYield'
import { useYieldProviders } from '@/react-queries/queries/yieldxyz/useYieldProviders'
import { useYieldValidators } from '@/react-queries/queries/yieldxyz/useYieldValidators'
import {
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountIdsByAssetIdFilter,
  selectUserCurrencyToUsdRate,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const backIcon = <ArrowBackIcon />

const layoutDirection: ResponsiveValue<Property.FlexDirection> = {
  base: 'column',
  lg: 'row',
}

const actionColumnMaxWidth = { base: '100%', lg: '500px' }

export const YieldDetail = memo(() => {
  const { yieldId } = useParams<{ yieldId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const translate = useTranslate()

  const userCurrencyToUsdRate = useAppSelector(selectUserCurrencyToUsdRate)

  const { data: yieldItem, isLoading, error } = useYield(yieldId ?? '')

  const selectorAssetId =
    yieldItem?.token.assetId ?? yieldItem?.inputTokens?.[0]?.assetId ?? undefined

  const inputTokenAssetId = yieldItem?.inputTokens[0]?.assetId ?? ''
  const inputTokenMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, inputTokenAssetId),
  )

  const isYieldMultiAccountEnabled = useFeatureFlag('YieldMultiAccount')
  const isYieldsPageEnabled = useFeatureFlag('YieldsPage')

  const handleBack = useCallback(
    () => (isYieldsPageEnabled ? navigate('/yields') : navigate(-1)),
    [navigate, isYieldsPageEnabled],
  )

  const availableAccounts = useAppSelector(state =>
    selectorAssetId
      ? selectPortfolioAccountIdsByAssetIdFilter(state, { assetId: selectorAssetId })
      : [],
  )

  const { selectedAccountId, handleAccountChange } = useYieldAccountSync({
    availableAccountIds: availableAccounts,
  })

  const showAccountSelector = isYieldMultiAccountEnabled && availableAccounts.length > 1

  const balanceAccountIds = useMemo(() => {
    if (isYieldMultiAccountEnabled) {
      return selectedAccountId ? [selectedAccountId] : undefined
    }
    return availableAccounts.length > 0 ? availableAccounts : undefined
  }, [isYieldMultiAccountEnabled, selectedAccountId, availableAccounts])

  const { data: allBalancesData, isFetching: isBalancesFetching } = useAllYieldBalances({
    accountIds: balanceAccountIds,
  })
  const balances = yieldItem?.id ? allBalancesData?.normalized[yieldItem.id] : undefined
  const isBalancesLoading = !allBalancesData && isBalancesFetching

  const validatorParam = searchParams.get('validator')
  const defaultValidator = yieldItem?.id ? getDefaultValidatorForYield(yieldItem.id) : undefined

  const isStaking = yieldItem?.mechanics.type === 'staking'
  const requiresValidatorSelection = yieldItem?.mechanics.requiresValidatorSelection ?? false
  const shouldFetchValidators = isStaking && requiresValidatorSelection

  const selectedValidatorAddress = useMemo(() => {
    if (!requiresValidatorSelection) return undefined
    return validatorParam || defaultValidator
  }, [requiresValidatorSelection, validatorParam, defaultValidator])
  const { data: validators } = useYieldValidators(yieldItem?.id ?? '', shouldFetchValidators)
  const { data: yieldProviders } = useYieldProviders()

  const maybeValidatorOrProvider = useMemo(() => {
    if (isStaking && requiresValidatorSelection && selectedValidatorAddress) {
      const found = validators?.find(v => v.address === selectedValidatorAddress)
      if (found) return { name: found.name, logoURI: found.logoURI }
      if (selectedValidatorAddress === SHAPESHIFT_COSMOS_VALIDATOR_ADDRESS) {
        return { name: SHAPESHIFT_VALIDATOR_NAME, logoURI: SHAPESHIFT_VALIDATOR_LOGO }
      }
      if (selectedValidatorAddress === FIGMENT_SOLANA_VALIDATOR_ADDRESS) {
        return { name: FIGMENT_VALIDATOR_NAME, logoURI: FIGMENT_VALIDATOR_LOGO }
      }
    }
    if (yieldItem) {
      const provider = yieldProviders?.[yieldItem.providerId]
      if (provider) {
        return {
          name: provider.name,
          logoURI: provider.logoURI,
          description: provider.description,
          documentation: provider.references?.[0] ?? provider.website,
        }
      }
      // Fallback for providers not in the API (e.g., drift)
      // NOTE: This shouldn't happen and is a bug upstream, currently happens w/ Drift.
      // Report to Yield if you see some other provider missing in /providers in the future.
      return {
        name: yieldItem.providerId.charAt(0).toUpperCase() + yieldItem.providerId.slice(1),
        logoURI: yieldItem.metadata.logoURI,
      }
    }
    return null
  }, [
    isStaking,
    requiresValidatorSelection,
    selectedValidatorAddress,
    validators,
    yieldItem,
    yieldProviders,
  ])

  const titleOverride = useMemo(() => {
    if (!yieldItem) return undefined
    const isNativeStaking =
      yieldItem.mechanics.type === 'staking' && yieldItem.mechanics.requiresValidatorSelection
    if (isNativeStaking) return translate('yieldXYZ.nativeStaking')
    return getYieldDisplayName(yieldItem)
  }, [yieldItem, translate])

  const userBalances = (() => {
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
  })()

  useEffect(() => {
    if (!yieldId) navigate(isYieldsPageEnabled ? '/yields' : '/')
  }, [yieldId, navigate, isYieldsPageEnabled])

  const isModalOpen = searchParams.get('modal') === 'yield'

  const loadingElement = (
    <Container maxW={{ base: 'full', md: 'container.md' }} py={20}>
      <Flex direction='column' gap={8} alignItems='center'>
        <Text color='text.subtle' fontSize='lg'>
          {translate('common.loadingText')}
        </Text>
      </Flex>
    </Container>
  )

  const errorElement = (
    <Container maxW={{ base: 'full', md: 'container.md' }} py={20}>
      <Box textAlign='center' py={16} bg='background.surface.raised.base' borderRadius='2xl'>
        <Heading as='h2' size='xl' mb={4}>
          {translate('common.error')}
        </Heading>
        <Text color='text.subtle'>
          {error ? String(error) : translate('common.noResultsFound')}
        </Text>
        <Button
          mt={8}
          onClick={() => (isYieldsPageEnabled ? navigate('/yields') : navigate(-1))}
          size='lg'
        >
          {translate('common.back')}
        </Button>
      </Box>
    </Container>
  )

  if (isLoading) return loadingElement
  if (error || !yieldItem) return errorElement

  return (
    <Box bg='background.surface.base' minH='100vh' pb={20}>
      <Container
        maxW={{ base: 'full', md: 'container.md', lg: '1400px' }}
        px={{ base: 4, md: 8, lg: 12 }}
      >
        <Flex py={4} align='center' justify='space-between'>
          <IconButton
            aria-label={translate('common.back')}
            icon={backIcon}
            variant='ghost'
            size='sm'
            color='text.subtle'
            onClick={handleBack}
            _hover={{ color: 'text.base' }}
          />
          <Display.Desktop>
            {showAccountSelector && selectorAssetId && (
              <AccountSelector
                assetId={selectorAssetId}
                accountId={selectedAccountId}
                onChange={handleAccountChange}
              />
            )}
          </Display.Desktop>
        </Flex>

        <Display.Mobile>
          {showAccountSelector && selectorAssetId && (
            <Flex justify='center' mb={2}>
              <AccountSelector
                assetId={selectorAssetId}
                accountId={selectedAccountId}
                onChange={handleAccountChange}
              />
            </Flex>
          )}
          <YieldHero
            yieldItem={yieldItem}
            userBalanceUsd={userBalances.userCurrency}
            userBalanceCrypto={userBalances.crypto}
            validatorOrProvider={maybeValidatorOrProvider}
            titleOverride={titleOverride}
          />
          <Stack gap={4} mt={4}>
            <YieldPositionCard
              yieldItem={yieldItem}
              balances={balances}
              isBalancesLoading={isBalancesLoading}
              selectedValidatorAddress={selectedValidatorAddress}
            />
            <YieldAvailableToDeposit
              yieldItem={yieldItem}
              inputTokenMarketData={inputTokenMarketData}
            />
            <YieldStats yieldItem={yieldItem} balances={balances} />
            {(!isStaking || !requiresValidatorSelection) && maybeValidatorOrProvider && (
              <YieldProviderInfo
                providerId={yieldItem.providerId}
                providerName={maybeValidatorOrProvider.name}
                providerLogoURI={maybeValidatorOrProvider.logoURI}
                providerWebsite={maybeValidatorOrProvider.documentation}
              />
            )}
            <YieldRelatedMarkets
              currentYieldId={yieldItem.id}
              tokenSymbol={yieldItem.token.symbol}
            />
          </Stack>
        </Display.Mobile>

        <Display.Desktop>
          <Flex gap={6} flexDir={layoutDirection}>
            <Stack gap={4} flex={1}>
              <YieldInfoCard
                yieldItem={yieldItem}
                validatorOrProvider={maybeValidatorOrProvider}
                titleOverride={titleOverride}
              />
              <YieldStats yieldItem={yieldItem} balances={balances} />
              {(!isStaking || !requiresValidatorSelection) && maybeValidatorOrProvider && (
                <YieldProviderInfo
                  providerId={yieldItem.providerId}
                  providerName={maybeValidatorOrProvider.name}
                  providerLogoURI={maybeValidatorOrProvider.logoURI}
                  providerWebsite={maybeValidatorOrProvider.documentation}
                />
              )}
              <YieldRelatedMarkets
                currentYieldId={yieldItem.id}
                tokenSymbol={yieldItem.token.symbol}
              />
            </Stack>

            <Stack
              gap={4}
              maxW={actionColumnMaxWidth}
              w='full'
              position='sticky'
              top={4}
              alignSelf='flex-start'
            >
              <YieldPositionCard
                yieldItem={yieldItem}
                balances={balances}
                isBalancesLoading={isBalancesLoading}
                selectedValidatorAddress={selectedValidatorAddress}
              />
              <YieldAvailableToDeposit
                yieldItem={yieldItem}
                inputTokenMarketData={inputTokenMarketData}
              />
            </Stack>
          </Flex>
        </Display.Desktop>
      </Container>

      {isModalOpen && <YieldManager />}
    </Box>
  )
})
