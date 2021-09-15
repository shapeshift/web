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
  { icon: AssetsIcon, name: 'AssetsIcon' },
  { icon: CircleIcon, name: 'CircleIcon' },
  { icon: DashboardIcon, name: 'DashboardIcon' },
  { icon: DiscordIcon, name: 'DiscordIcon' },
  { icon: EarnIcon, name: 'EarnIcon' },
  { icon: FacebookIcon, name: 'FacebookIcon' },
  { icon: FoxIcon, name: 'FoxIcon' },
  { icon: InstagramIcon, name: 'InstagramIcon' },
  { icon: KeepKeyIcon, name: 'KeepKeyIcon' },
  { icon: MediumIcon, name: 'MediumIcon' },
  { icon: QRCodeIcon, name: 'QRCodeIcon' },
  { icon: ShapeShiftVertical, name: 'ShapeShiftVertical' },
  { icon: TelegramIcon, name: 'TelegramIcon' },
  { icon: TwitterIcon, name: 'TwitterIcon' },
  { icon: YouTubeIcon, name: 'YouTubeIcon' }
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
    {icons.map(({ icon, name }) => {
      return (
        <Center flexDir='column' py={4}>
          {createElement(icon, { w: '50px', h: '50px', mb: 2 })}
          <RawText>{name}</RawText>
        </Center>
      )
    })}
  </HStack>
)
