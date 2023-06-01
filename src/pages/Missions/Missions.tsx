import { Box, chakra, Container, DarkMode, Heading, Stack } from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import FoxMissionsBg from 'assets/fox-missions-bg.jpg'
import FoxArmyBg from 'assets/foxarmy-bg.png'
import FoxAtarBg from 'assets/foxatar-card-bg.png'
import OptimismBg from 'assets/op-card-bg.png'
import OpLogo from 'assets/op-logo.png'
import YatBg from 'assets/yat-mission-bg.png'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import { ScrollCarousel } from 'components/ScrollCarousel/ScrollCarousel'
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
        onClick: () => window.open('https://rewards.shapeshift.com/optimistic-fox-1'),
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
      {
        title: translate('missions.foxArmy.title'),
        subtitle: translate('missions.foxArmy.subtitle'),
        buttonText: translate('missions.foxArmy.cta'),
        coverImage: FoxArmyBg,
        image: OpLogo,
        onClick: () => window.open('https://app.mercle.xyz/shapeshift/events'),
        startDate: '2023-06-04 17:00 UTC',
        endDate: '2023-06-08 17:00 UTC',
      },
      {
        title: translate('missions.yat.title'),
        subtitle: translate('missions.yat.subtitle'),
        buttonText: translate('missions.yat.cta'),
        coverImage: YatBg,
        image: OpLogo,
        onClick: () => window.open('https://fantasy.y.at/invite/yduad7mm'),
      },
    ]
  }, [translate])
  const renderMissions = useMemo(() => {
    const now = dayjs()
    const groupedMissions: {
      future: MissionProps[]
      past: MissionProps[]
      active: MissionProps[]
    } = missionItems.reduce(
      (groups, mission) => {
        const start = dayjs(mission.startDate)
        const end = dayjs(mission.endDate)
        if (now.isBefore(start) || !mission.onClick) {
          groups.future.push(mission)
        } else if (now.isAfter(end)) {
          groups.past.push(mission)
        } else {
          groups.active.push(mission)
        }
        return groups
      },
      { future: [] as MissionProps[], past: [] as MissionProps[], active: [] as MissionProps[] },
    )
    return (
      <Container maxWidth='full' display='flex' flexDir='column' gap={12} px={6}>
        {groupedMissions.active.length > 0 && (
          <Stack spacing={6}>
            <Heading as='h5'>{translate('missions.activeMissions')}</Heading>
            <ScrollCarousel>
              {groupedMissions.active.map(mission => (
                <Mission key={mission.title} {...mission} />
              ))}
            </ScrollCarousel>
          </Stack>
        )}
        {groupedMissions.future.length > 0 && (
          <Stack spacing={6}>
            <Heading as='h5'>{translate('missions.comingSoon')}</Heading>
            <ScrollCarousel>
              {groupedMissions.future.map(mission => (
                <Mission key={mission.title} {...mission} />
              ))}
            </ScrollCarousel>
          </Stack>
        )}

        {groupedMissions.past.length > 0 && (
          <Stack spacing={6}>
            <Heading as='h5'>{translate('missions.endedMissions')}</Heading>
            <ScrollCarousel>
              {groupedMissions.past.map(mission => (
                <Mission key={mission.title} {...mission} />
              ))}
            </ScrollCarousel>
          </Stack>
        )}
      </Container>
    )
  }, [missionItems, translate])
  return (
    <DarkMode>
      <SEO title={translate('missions.subtitle')} />
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
          backgroundPosition={{ base: 'center 110%', md: 'center 110%' }}
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
                  display: { base: 'none', md: 'inline' },
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
