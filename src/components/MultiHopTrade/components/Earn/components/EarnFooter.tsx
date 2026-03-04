import { InfoIcon } from '@chakra-ui/icons'
import type { CardFooterProps, FlexProps } from '@chakra-ui/react'
import { Box, CardFooter, Flex, HStack, Icon, Skeleton, Text, VStack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { memo, useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { MdSwapHoriz } from 'react-icons/md'
import { useTranslate } from 'react-polyglot'

import { Amount } from '@/components/Amount/Amount'
import { ButtonWalletPredicate } from '@/components/ButtonWalletPredicate/ButtonWalletPredicate'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'
import { GradientApy } from '@/pages/Yields/components/GradientApy'

type EarnFooterProps = {
  selectedYield: AugmentedYieldDto | undefined
  hasUserEnteredAmount: boolean
  isLoading: boolean
  sellAsset: Asset
  estimatedYearlyEarnings: string | undefined
  estimatedYearlyEarningsUserCurrency: string | undefined
  isConnected: boolean
  isBelowMinimum: boolean
  isInsufficientBalance: boolean
  networkFeeFiatUserCurrency: string | undefined
  isQuoteLoading: boolean
}

const footerBgProp = { base: 'background.surface.base', md: 'transparent' }
const footerPosition: CardFooterProps['position'] = { base: 'sticky', md: 'static' }

const statsBoxSx: FlexProps = {
  bg: 'background.surface.raised.base',
  borderRadius: 'lg',
  p: 3,
  borderWidth: '1px',
  borderColor: 'border.base',
}

const getActionTextKey = (yieldType: string | undefined): string => {
  switch (yieldType) {
    case 'native-staking':
    case 'pooled-staking':
    case 'liquid-staking':
    case 'staking':
      return 'defi.stake'
    case 'vault':
      return 'common.deposit'
    case 'lending':
      return 'common.supply'
    default:
      return 'common.deposit'
  }
}

type ExplainerItem = {
  icon: React.ReactNode
  textKey: string
}

const getYieldExplainers = (selectedYield: AugmentedYieldDto): ExplainerItem[] => {
  const yieldType = selectedYield.mechanics.type
  const outputTokenSymbol = selectedYield.outputToken?.symbol

  switch (yieldType) {
    case 'liquid-staking':
      return [
        {
          icon: <Icon as={MdSwapHoriz} color='text.subtle' />,
          textKey: outputTokenSymbol
            ? 'earn.explainers.liquidStakingReceive'
            : 'earn.explainers.liquidStakingTrade',
        },
        {
          icon: <Icon as={FaGift} color='text.subtle' />,
          textKey: 'earn.explainers.rewardsSchedule',
        },
        {
          icon: <InfoIcon color='text.subtle' />,
          textKey: 'earn.explainers.liquidStakingWithdraw',
        },
      ]
    case 'native-staking':
    case 'pooled-staking':
    case 'staking':
      return [
        {
          icon: <Icon as={FaGift} color='text.subtle' />,
          textKey: 'earn.explainers.rewardsSchedule',
        },
        { icon: <InfoIcon color='text.subtle' />, textKey: 'earn.explainers.stakingUnbonding' },
      ]
    case 'restaking':
      return [
        {
          icon: <Icon as={FaGift} color='text.subtle' />,
          textKey: 'earn.explainers.restakingYield',
        },
        { icon: <InfoIcon color='text.subtle' />, textKey: 'earn.explainers.restakingWithdraw' },
      ]
    case 'vault':
      return [
        { icon: <Icon as={FaGift} color='text.subtle' />, textKey: 'earn.explainers.vaultYield' },
        { icon: <InfoIcon color='text.subtle' />, textKey: 'earn.explainers.vaultWithdraw' },
      ]
    case 'lending':
      return [
        { icon: <Icon as={FaGift} color='text.subtle' />, textKey: 'earn.explainers.lendingYield' },
        { icon: <InfoIcon color='text.subtle' />, textKey: 'earn.explainers.lendingWithdraw' },
      ]
    default:
      return []
  }
}

export const EarnFooter = memo(
  ({
    selectedYield,
    hasUserEnteredAmount,
    isLoading,
    sellAsset,
    estimatedYearlyEarnings,
    estimatedYearlyEarningsUserCurrency,
    isConnected,
    isBelowMinimum,
    isInsufficientBalance,
    networkFeeFiatUserCurrency,
    isQuoteLoading,
  }: EarnFooterProps) => {
    const translate = useTranslate()

    const apy = useMemo(
      () => (selectedYield ? (selectedYield.rewardRate?.total ?? 0) * 100 : 0),
      [selectedYield],
    )

    const apyDisplay = useMemo(() => `${apy.toFixed(2)}%`, [apy])

    const minDeposit = selectedYield?.mechanics.entryLimits.minimum
    const hasMinDeposit = minDeposit && bnOrZero(minDeposit).gt(0)

    const hasValidationError = isBelowMinimum || isInsufficientBalance
    const isDisabled =
      !hasUserEnteredAmount || !selectedYield || isLoading || !isConnected || hasValidationError

    const buttonText = useMemo(() => {
      if (!isConnected) return translate('common.connectWallet')
      if (!selectedYield) return translate('earn.selectYieldOpportunity')
      if (!hasUserEnteredAmount) return translate('common.enterAmount')
      if (isInsufficientBalance) return translate('common.insufficientFunds')
      if (isBelowMinimum) return translate('earn.belowMinimum')
      return translate(getActionTextKey(selectedYield.mechanics.type))
    }, [
      isConnected,
      selectedYield,
      hasUserEnteredAmount,
      isInsufficientBalance,
      isBelowMinimum,
      translate,
    ])

    const explainers = useMemo(
      () => (selectedYield ? getYieldExplainers(selectedYield) : []),
      [selectedYield],
    )

    const rewardSchedule = selectedYield?.mechanics.rewardSchedule
    const cooldownDays = useMemo(() => {
      const seconds = selectedYield?.mechanics.cooldownPeriod?.seconds
      if (!seconds) return undefined
      return Math.ceil(seconds / 86400)
    }, [selectedYield?.mechanics.cooldownPeriod?.seconds])

    return (
      <CardFooter
        flexDir='column'
        px={0}
        py={0}
        position={footerPosition}
        bottom='var(--mobile-nav-offset)'
        bg={footerBgProp}
        borderTopWidth={1}
        borderColor='border.subtle'
      >
        <Flex
          flexDir='column'
          gap={4}
          px={4}
          py={4}
          bg={footerBgProp}
          borderBottomRadius='xl'
          width='full'
        >
          {selectedYield && hasUserEnteredAmount && (
            <Box {...statsBoxSx}>
              <Flex justify='space-between' align='center'>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('common.apy')}
                </Text>
                {isLoading ? (
                  <Skeleton height='16px' width='60px' />
                ) : (
                  <GradientApy fontSize='sm'>{apyDisplay}</GradientApy>
                )}
              </Flex>

              {estimatedYearlyEarnings && (
                <Flex justify='space-between' align='center' mt={3}>
                  <Text fontSize='sm' color='text.subtle'>
                    {translate('earn.estimatedYearlyEarnings')}
                  </Text>
                  {isLoading ? (
                    <Skeleton height='16px' width='80px' />
                  ) : (
                    <Flex direction='column' align='flex-end'>
                      <GradientApy fontSize='sm'>
                        <Amount.Crypto
                          value={estimatedYearlyEarnings}
                          symbol={sellAsset?.symbol ?? ''}
                          fontWeight='bold'
                        />
                      </GradientApy>
                      {estimatedYearlyEarningsUserCurrency && (
                        <Text fontSize='xs' color='text.subtle'>
                          <Amount.Fiat value={estimatedYearlyEarningsUserCurrency} />
                        </Text>
                      )}
                    </Flex>
                  )}
                </Flex>
              )}

              {hasMinDeposit && (
                <Flex justify='space-between' align='center' mt={3}>
                  <Text fontSize='sm' color='text.subtle'>
                    {translate('earn.minimumDeposit')}
                  </Text>
                  <Amount.Crypto
                    value={minDeposit}
                    symbol={sellAsset?.symbol ?? ''}
                    fontSize='sm'
                    fontWeight='medium'
                    color={isBelowMinimum ? 'red.500' : 'text.base'}
                  />
                </Flex>
              )}

              {selectedYield.mechanics.type && (
                <Flex justify='space-between' align='center' mt={3}>
                  <Text fontSize='sm' color='text.subtle'>
                    {translate('earn.yieldType')}
                  </Text>
                  <Text fontSize='sm' fontWeight='medium' textTransform='capitalize'>
                    {selectedYield.mechanics.type.replace(/-/g, ' ')}
                  </Text>
                </Flex>
              )}

              <Flex justify='space-between' align='center' mt={3}>
                <Text fontSize='sm' color='text.subtle'>
                  {translate('trade.networkFee')}
                </Text>
                {isQuoteLoading ? (
                  <Skeleton height='16px' width='60px' />
                ) : networkFeeFiatUserCurrency ? (
                  <Amount.Fiat
                    value={networkFeeFiatUserCurrency}
                    fontSize='sm'
                    fontWeight='medium'
                  />
                ) : (
                  <Text fontSize='sm' color='text.subtle'>
                    —
                  </Text>
                )}
              </Flex>
            </Box>
          )}

          {selectedYield && explainers.length > 0 && (
            <VStack spacing={3} align='stretch'>
              {explainers.map((explainer, index) => (
                <HStack key={index} spacing={3} align='flex-start'>
                  <Box mt={0.5}>{explainer.icon}</Box>
                  <Text fontSize='sm' color='text.subtle'>
                    {translate(explainer.textKey, {
                      symbol: selectedYield.outputToken?.symbol ?? sellAsset?.symbol ?? '',
                      schedule: rewardSchedule ?? '',
                      days: cooldownDays ?? '',
                    })}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}

          <ButtonWalletPredicate
            type='submit'
            colorScheme={hasValidationError ? 'red' : 'blue'}
            size='lg-multiline'
            isDisabled={isDisabled}
            isLoading={isLoading}
            isValidWallet
            data-testid='earn-submit-button'
          >
            {buttonText}
          </ButtonWalletPredicate>
        </Flex>
      </CardFooter>
    )
  },
)
