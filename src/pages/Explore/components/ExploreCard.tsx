import type { CardProps } from '@chakra-ui/react'
import { Card, CardBody, Center, Stack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { RiArrowRightUpLine } from 'react-icons/ri'

import { DefiIcon } from '@/components/Icons/DeFi'
import { FoxIcon } from '@/components/Icons/FoxIcon'
import { PoolsIcon } from '@/components/Icons/Pools'
import { TCYIcon } from '@/components/Icons/TCYIcon'
import { Text } from '@/components/Text'

type ExploreCardProps = {
  title: string
  body: string
  icon: 'pools' | 'fox' | 'tcy' | 'defi'
} & CardProps

const activeCard = {
  opacity: '0.5',
}

const linkIcon = <RiArrowRightUpLine />

const iconMap = {
  pools: <PoolsIcon />,
  fox: <FoxIcon />,
  tcy: <TCYIcon />,
  defi: <DefiIcon />,
} as const

export const ExploreCard: React.FC<ExploreCardProps> = props => {
  const { title, body, icon, ...rest } = props

  const iconElement = useMemo(() => iconMap[icon], [icon])

  return (
    <Card _active={activeCard} {...rest}>
      <CardBody display='flex' flexDir='column' alignItems='flex-start'>
        <Center fontSize='4xl' width='auto' mb={2} opacity={'0.3'}>
          {iconElement}
        </Center>
        <Stack>
          <Text fontWeight='bold' translation={title} />
          <Text color='whiteAlpha.700' translation={body} />
        </Stack>
        <Center fontSize='lg' width='auto' opacity={'0.3'} position='absolute' right={4} top={4}>
          {linkIcon}
        </Center>
      </CardBody>
    </Card>
  )
}
