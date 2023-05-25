import { Box, chakra, Container, DarkMode, Heading } from '@chakra-ui/react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import FoxMissionsBg from 'assets/fox-missions-bg.jpg'
import FoxAtarBg from 'assets/foxatar-card-bg.png'
import OptimismBg from 'assets/op-card-bg.png'
import OpLogo from 'assets/op-logo.png'
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
        onClick: () => window.open('https://rewards.shapeshift.com/seasons/optimism-season-1'),
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
    <DarkMode>
      <Main
        pt={0}
        px={0}
        pb={12}
        display='flex'
        flexDir='column'
        bg='gray.800'
        flex={1}
        width='full'
        hideBreadcrumbs
      >
        <Box
          mt='-4.5rem'
          bgImage={FoxMissionsBg}
          backgroundSize={{ base: 'contain', md: 'cover' }}
          backgroundRepeat='no-repeat'
          backgroundPosition={{ base: 'center -140%', md: 'center 110%' }}
          pt='22%'
        >
          <Container textAlign='center' maxWidth='container.md' py={16}>
            <Heading textShadow='0 2px rgba(0,0,0,.4)' as='h4' color='white'>
              {translate('missions.subtitle')}
            </Heading>
            <Heading color='white' fontSize='5xl' lineHeight='none' letterSpacing='-0.015em'>
              <chakra.span textShadow='0 4px 15px #000'>
                {translate('missions.title.1')}{' '}
              </chakra.span>
              <chakra.span
                backgroundImage='linear-gradient(97.53deg, #F7F2F4 5.6%, #7B61FF 59.16%, #46F4C8 119.34%)'
                backgroundClip='text'
                data-text={translate('missions.title.2')}
                position='relative'
                zIndex='1'
                _after={{
                  content: 'attr(data-text)',
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  textShadow: '0 4px 15px #000',
                  zIndex: -1,
                }}
              >
                {translate('missions.title.2')}
              </chakra.span>
            </Heading>
            <RawText
              textShadow='0 3px rgba(0,0,0,.4)'
              fontSize='2xl'
              letterSpacing='0.012em'
              mt={4}
              mx={4}
              color='white'
            >
              {translate('missions.body')}
            </RawText>
          </Container>
        </Box>
        {renderMissions}
      </Main>
    </DarkMode>
  )
}
