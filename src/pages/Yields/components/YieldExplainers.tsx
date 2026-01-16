import { InfoIcon } from '@chakra-ui/icons'
import { Box, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import React, { memo, useMemo } from 'react'
import { FaGift } from 'react-icons/fa'
import { MdSwapHoriz } from 'react-icons/md'
import { useTranslate } from 'react-polyglot'

import type { AugmentedYieldDto } from '@/lib/yieldxyz/types'

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

type YieldExplainersProps = {
  selectedYield: AugmentedYieldDto
  sellAssetSymbol?: string
}

export const YieldExplainers = memo(({ selectedYield, sellAssetSymbol }: YieldExplainersProps) => {
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
