import { chakra, Container, Heading, useColorModeValue } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import FoxAtarBg from 'assets/foxatar.png'
import OpLogo from 'assets/op-logo.png'
import OptimismBg from 'assets/optimism-bg.png'
import { Main } from 'components/Layout/Main'
import { RawText } from 'components/Text'

import type { MissionProps } from './Mission'
import { Mission } from './Mission'

export const Missions = () => {
  const translate = useTranslate()
  const missionItems: MissionProps[] = useMemo(() => {
    return [
      {
        title: translate('missions.optimism.title'),
        subtitle: translate('missions.optimism.subtitle'),
        buttonText: translate('missions.optimism.cta'),
        coverImage: OptimismBg,
        image: OpLogo,
        onClick: () => window.open('http://google.com'),
        endDate: '2023-06-30 08:00 AM',
      },
      {
        title: translate('missions.foxatar.title'),
        subtitle: translate('missions.foxatar.subtitle'),
        buttonText: translate('missions.foxatar.cta'),
        coverImage: FoxAtarBg,
        image: OpLogo,
        onClick: () => window.open('https://app.mercle.xyz/shapeshift/events'),
      },
    ]
  }, [translate])
  const renderMissions = useMemo(() => {
    return (
      <Container
        px={{ base: 0, md: 6 }}
        maxWidth='container.lg'
        display='grid'
        gridTemplateColumns={{ base: '1fr', lg: '1fr 1fr' }}
        gap={6}
      >
        {missionItems.map(mission => (
          <Mission key={mission.title} {...mission} />
        ))}
      </Container>
    )
  }, [missionItems])
  return (
    <Main
      pt='4.5rem'
      mt='-4.5rem'
      px={0}
      pb={12}
      display='flex'
      flexDir='column'
      flex={1}
      width='full'
      hideBreadcrumbs
    >
      <Container textAlign='center' maxWidth='container.md' py={16}>
        {/* <Heading fontSize='4xl'>{translate('missions.title')}</Heading>
        <RawText fontSize='lg' letterSpacing='0.012em'>
          {translate('missions.body')}
        </RawText> */}
        <Heading as='h4'>FOX Missions</Heading>
        <Heading fontSize='5xl' lineHeight='none' letterSpacing='-0.015em'>
          Unleash the Decentralized Universe and{' '}
          <chakra.span
            backgroundImage='linear-gradient(97.53deg, #F7F2F4 5.6%, #7B61FF 59.16%, #46F4C8 119.34%)'
            backgroundClip='text'
          >
            Reap Rewards
          </chakra.span>
        </Heading>
        <RawText
          color={useColorModeValue('blackAlpha.500', 'whiteAlpha.700')}
          fontSize='2xl'
          letterSpacing='0.012em'
          mt={4}
          mx={4}
        >
          Embark on Missions, Earn Rewards, and expand your knowledge of the Ever-Expanding
          ShapeShift Ecosystem
        </RawText>
      </Container>
      {renderMissions}
    </Main>
  )
}
