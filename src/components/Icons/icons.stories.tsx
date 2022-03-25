/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable import/no-default-export */
import { Center, Container, HStack } from '@chakra-ui/react'
import { createElement } from 'react'
import { RawText } from 'components/Text'

import { AssetsIcon } from './Assets'
import { CircleIcon } from './Circle'
import { DashboardIcon } from './Dashboard'
import { DiscordIcon } from './DiscordIcon'
import { EarnIcon } from './Earn'
import { FacebookIcon } from './FacebookIcon'
import { FoxIcon } from './FoxIcon'
import { InstagramIcon } from './InstagramIcon'
import { KeepKeyIcon } from './KeepKeyIcon'
import { MediumIcon } from './MediumIcon'
import { QRCodeIcon } from './QRCode'
import { ShapeShiftVertical } from './SSVerticalIcon'
import { TelegramIcon } from './TelegramIcon'
import { TwitterIcon } from './TwitterIcon'
import { YouTubeIcon } from './YouTubeIcon'

const icons = [
  AssetsIcon,
  CircleIcon,
  DashboardIcon,
  DiscordIcon,
  EarnIcon,
  FacebookIcon,
  FoxIcon,
  InstagramIcon,
  KeepKeyIcon,
  MediumIcon,
  QRCodeIcon,
  ShapeShiftVertical,
  TelegramIcon,
  TwitterIcon,
  YouTubeIcon
]

export default {
  title: 'Icons/custom',
  decorators: [
    (Story: any) => (
      <Container mt='40px' maxW='100%'>
        <Story />
      </Container>
    )
  ]
}

export const Basic = () => (
  <HStack spacing='24px' wrap='wrap'>
    {icons.map(icon => {
      return (
        <Center flexDir='column' py={4}>
          {createElement(icon, { w: '50px', h: '50px', mb: 2 })}
          <RawText>{`${icon.displayName}`}</RawText>
        </Center>
      )
    })}
  </HStack>
)
