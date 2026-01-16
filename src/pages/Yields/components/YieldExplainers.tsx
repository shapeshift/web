import { InfoIcon } from '@chakra-ui/icons'
import { Box, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import React, { memo, useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { MdSwapHoriz } from 'react-icons/md'
import { useTranslate } from 'react-polyglot'

import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

const swapIcon = <Icon as={MdSwapHoriz} color='text.subtle' />
const giftIcon = <Icon as={FaGift} color='text.subtle' />
const infoIcon = <InfoIcon color='text.subtle' />

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
          icon: swapIcon,
          textKey: outputTokenSymbol
            ? 'earn.explainers.liquidStakingReceive'
            : 'earn.explainers.liquidStakingTrade',
        },
        {
          icon: giftIcon,
          textKey: 'earn.explainers.rewardsSchedule',
        },
        {
          icon: infoIcon,
          textKey: 'earn.explainers.liquidStakingWithdraw',
        },
      ]
    case 'native-staking':
    case 'pooled-staking':
    case 'staking':
      return [
        {
          icon: giftIcon,
          textKey: 'earn.explainers.rewardsSchedule',
        },
        { icon: infoIcon, textKey: 'earn.explainers.stakingUnbonding' },
      ]
    case 'restaking':
      return [
        {
          icon: giftIcon,
          textKey: 'earn.explainers.restakingYield',
        },
        { icon: infoIcon, textKey: 'earn.explainers.restakingWithdraw' },
      ]
    case 'vault':
      return [
        { icon: giftIcon, textKey: 'earn.explainers.vaultYield' },
        { icon: infoIcon, textKey: 'earn.explainers.vaultWithdraw' },
      ]
    case 'lending':
      return [
        { icon: giftIcon, textKey: 'earn.explainers.lendingYield' },
        { icon: infoIcon, textKey: 'earn.explainers.lendingWithdraw' },
      ]
    default:
      return []
  }
}

type YieldExplainersProps = {
  selectedYield: AugmentedYieldDto
  sellAssetSymbol?: string
}

export const YieldExplainers = memo(function YieldExplainers({
  selectedYield,
  sellAssetSymbol,
}: YieldExplainersProps) {
  const translate = useTranslate()

  const explainers = useMemo(() => getYieldExplainers(selectedYield), [selectedYield])

  const rewardSchedule = selectedYield.mechanics.rewardSchedule

  const cooldownDays = useMemo(() => {
    const seconds = selectedYield.mechanics.cooldownPeriod?.seconds
    if (!seconds) return undefined
    return Math.ceil(seconds / 86400)
  }, [selectedYield.mechanics.cooldownPeriod?.seconds])

  if (explainers.length === 0) return null

  return (
    <VStack spacing={3} align='stretch'>
      {explainers.map((explainer, index) => (
        <HStack key={index} spacing={3} align='flex-start'>
          <Box mt={0.5}>{explainer.icon}</Box>
          <Text fontSize='sm' color='text.subtle'>
            {translate(explainer.textKey, {
              symbol: selectedYield.outputToken?.symbol ?? sellAssetSymbol ?? '',
              schedule: rewardSchedule ?? '',
              days: cooldownDays ?? '',
            })}
          </Text>
        </HStack>
      ))}
    </VStack>
  )
})
