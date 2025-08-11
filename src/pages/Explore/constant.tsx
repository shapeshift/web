import { Icon } from '@chakra-ui/react'
import { FaSwimmingPool } from 'react-icons/fa'
import { IoMdWater } from 'react-icons/io'
import { TbBuildingBank, TbCirclePercentage, TbTarget, TbWorld } from 'react-icons/tb'

export enum PortalsTags {
  LiquidStaking = 'liquid-staking',
  Yield = 'yield',
  Lending = 'lending',
  Rwa = 'rwa',
  YieldAggregator = 'yield-aggregator',
  Pool = 'pool',
  CLP = 'clp',
}

export const exploreTagsIcons = {
  [PortalsTags.LiquidStaking]: <Icon as={IoMdWater} color='blue.500' fontSize='md' />,
  [PortalsTags.Yield]: <Icon as={TbCirclePercentage} color='green.500' fontSize='md' />,
  [PortalsTags.Lending]: <Icon as={TbBuildingBank} color='purple.500' fontSize='md' />,
  [PortalsTags.Rwa]: <Icon as={TbWorld} color='orange.500' fontSize='md' />,
  [PortalsTags.YieldAggregator]: <Icon as={TbCirclePercentage} color='red.500' fontSize='md' />,
  [PortalsTags.Pool]: <Icon as={FaSwimmingPool} color='yellow.500' fontSize='md' />,
  [PortalsTags.CLP]: <Icon as={TbTarget} color='gray.500' fontSize='md' />,
}
