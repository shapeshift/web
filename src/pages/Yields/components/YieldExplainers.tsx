import { InfoIcon } from '@chakra-ui/icons'
import { Box, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { memo, useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { MdSwapHoriz } from 'react-icons/md'
import { useTranslate } from 'react-polyglot'

import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

const swapIcon = <Icon as={MdSwapHoriz} color='text.subtle' />
const giftIcon = <Icon as={FaGift} color='text.subtle' />
const infoIcon = <InfoIcon color='text.subtle' />

type ExplainerItem = {
  icon: ReactNode
  textKey: string
  relevance: 'enter' | 'exit' | 'both'
}

const getYieldExplainers = (selectedYield: AugmentedYieldDto): ExplainerItem[] => {
  const yieldType = selectedYield.mechanics.type
  const outputTokenSymbol = selectedYield.outputToken?.symbol

  switch (yieldType) {
    case 'liquid-staking':
      return [
        {
          icon: swapIcon,
          textKey: outputTokenSymbol
            ? 'earn.explainers.liquidStakingReceive'
            : 'earn.explainers.liquidStakingTrade',
          relevance: 'enter' as const,
        },
        { icon: giftIcon, textKey: 'earn.explainers.rewardsSchedule', relevance: 'enter' as const },
        {
          icon: infoIcon,
          textKey: 'earn.explainers.liquidStakingWithdraw',
          relevance: 'both' as const,
        },
      ]
    case 'native-staking':
    case 'pooled-staking':
    case 'staking':
      return [
        { icon: giftIcon, textKey: 'earn.explainers.rewardsSchedule', relevance: 'enter' as const },
        { icon: infoIcon, textKey: 'earn.explainers.stakingUnbonding', relevance: 'both' as const },
      ]
    case 'restaking':
      return [
        { icon: giftIcon, textKey: 'earn.explainers.restakingYield', relevance: 'enter' as const },
        {
          icon: infoIcon,
          textKey: 'earn.explainers.restakingWithdraw',
          relevance: 'both' as const,
        },
      ]
    case 'vault':
      return [
        { icon: giftIcon, textKey: 'earn.explainers.vaultYield', relevance: 'enter' as const },
        { icon: infoIcon, textKey: 'earn.explainers.vaultWithdraw', relevance: 'both' as const },
      ]
    case 'lending':
      return [
        { icon: giftIcon, textKey: 'earn.explainers.lendingYield', relevance: 'enter' as const },
        { icon: infoIcon, textKey: 'earn.explainers.lendingWithdraw', relevance: 'both' as const },
      ]
    default:
      return []
  }
}

type YieldExplainersProps = {
  selectedYield: AugmentedYieldDto
  sellAssetSymbol?: string
  action: 'enter' | 'exit' | 'claim'
}

export const YieldExplainers = memo(
  ({ selectedYield, sellAssetSymbol, action }: YieldExplainersProps) => {
    const translate = useTranslate()

    const actionRelevance = action === 'enter' ? 'enter' : 'exit'
    const explainers = useMemo(
      () =>
        getYieldExplainers(selectedYield).filter(
          e => e.relevance === actionRelevance || e.relevance === 'both',
        ),
      [selectedYield, actionRelevance],
    )

    const rewardSchedule = selectedYield.mechanics.rewardSchedule
    const outputSymbol = selectedYield.outputToken?.symbol

    const cooldownDays = useMemo(() => {
      const seconds = selectedYield.mechanics.cooldownPeriod?.seconds
      if (!seconds) return undefined
      return Math.ceil(seconds / 86400)
    }, [selectedYield.mechanics.cooldownPeriod?.seconds])

    const symbol = outputSymbol ?? sellAssetSymbol ?? ''

    const translatedExplainers = useMemo(() => {
      if (explainers.length === 0) return []
      return explainers.map(explainer => ({
        icon: explainer.icon,
        text: translate(explainer.textKey, {
          symbol,
          schedule: rewardSchedule ?? '',
          days: cooldownDays ?? '',
        }),
      }))
    }, [explainers, translate, symbol, rewardSchedule, cooldownDays])

    if (translatedExplainers.length === 0) return null

    return (
      <VStack spacing={3} align='stretch'>
        {translatedExplainers.map((explainer, index) => (
          <HStack key={index} spacing={3} align='flex-start'>
            <Box mt={0.5}>{explainer.icon}</Box>
            <Text fontSize='sm' color='text.subtle'>
              {explainer.text}
            </Text>
          </HStack>
        ))}
      </VStack>
    )
  },
)
