import {
  Box,
  Button,
  Card,
  chakra,
  Container,
  DarkMode,
  Flex,
  Heading,
  Stack,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { NavLink } from 'react-router-dom'
import FoxMissionsBg from 'assets/fox-missions-bg.jpg'
import FoxArmyBg from 'assets/foxarmy-bg.png'
import FoxAtarBg from 'assets/foxatar-card-bg.png'
import FoxRewardsBg from 'assets/foxrewards-mission.png'
import SponsorBg from 'assets/mission-sponsor-bg.jpg'
import OptimismBg from 'assets/op-card-bg.png'
import YatBg from 'assets/yat-mission-bg.png'
import { Carousel } from 'components/Carousel/Carousel'
import type { CarouselHeaderProps } from 'components/Carousel/types'
import { Main } from 'components/Layout/Main'
import { SEO } from 'components/Layout/Seo'
import type { FeatureListProps } from 'components/ScrollCarousel/ScrollCarousel'
import { ScrollCarousel } from 'components/ScrollCarousel/ScrollCarousel'
import { RawText } from 'components/Text'
import { FOX_MISSION_REQUEST_PAGE } from 'pages/Missions/constants'

import type { MissionProps } from './Mission'
import { Mission } from './Mission'

dayjs.extend(timezone)
dayjs.extend(customParseFormat)
// Timezone is MST for dates
dayjs.tz.setDefault('America/Denver')
const dateFormat = 'YYYY-MM-DD hh:mm A'

export const useGetMissions = () => {
  const now = dayjs()
  const translate = useTranslate()
  const missionItems: MissionProps[] = useMemo(() => {
    return [
      {
        title: translate('missions.foxatar.title'),
        subtitle: translate('missions.foxatar.subtitle'),
        buttonText: translate('missions.foxatar.cta'),
        coverImage: FoxAtarBg,
        onClick: () => window.open('https://app.mercle.xyz/shapeshift/events'),
      },
      {
        title: translate('missions.optimism.title'),
        subtitle: translate('missions.optimism.subtitle'),
        buttonText: translate('missions.optimism.cta'),
        coverImage: OptimismBg,
        onClick: () => window.open('https://rewards.shapeshift.com/optimistic-fox-1'),
        endDate: '2023-07-04 05:59 PM',
      },
      {
        title: translate('missions.optimism.title'),
        subtitle: translate('missions.optimism.subtitle'),
        buttonText: translate('missions.optimism.cta'),
        coverImage: OptimismBg,
        onClick: () => window.open('https://rewards.shapeshift.com/optimistic-fox-2'),
        startDate: '2023-07-04 05:59 PM',
        endDate: '2023-07-31 05:59 PM',
      },
      {
        title: translate('missions.foxArmy.title'),
        subtitle: translate('missions.foxArmy.subtitle'),
        buttonText: translate('missions.foxArmy.cta'),
        coverImage: FoxArmyBg,
        onClick: () =>
          window.open(
            'https://x.postmint.xyz/community/64665c31a6c1394b3a35be58/64997a2a590fc8641c50f51a',
          ),
        startDate: '2023-06-26 7:00 AM',
      },
      {
        title: translate('missions.yat.title'),
        subtitle: translate('missions.yat.subtitle'),
        buttonText: translate('missions.yat.cta'),
        coverImage: YatBg,
        onClick: () => window.open('https://fantasy.y.at/invite/yduad7mm'),
      },
      {
        title: translate('missions.foxRewards.title'),
        subtitle: translate('missions.foxRewards.subtitle'),
        buttonText: translate('missions.foxRewards.cta'),
        coverImage: FoxRewardsBg,
        startDate: '2025-01-01 7:00 AM',
        onClick: () => window.open('https://app.shapeshift.com'),
      },
    ]
  }, [translate])
  const groupedMissions: {
    future: MissionProps[]
    past: MissionProps[]
    active: MissionProps[]
  } = missionItems.reduce(
    (groups, mission) => {
      const start = dayjs(mission.startDate, dateFormat)
      const end = dayjs(mission.endDate, dateFormat)
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
  return groupedMissions
}
type MissionCarouselProps = {
  items?: MissionProps[]
  label: string
  sliderProps?: FeatureListProps
} & PropsWithChildren

export const MissionCarousel: React.FC<MissionCarouselProps> = ({
  items,
  label,
  sliderProps,
  children,
}) => {
  const translate = useTranslate()
  if (!items || (items.length === 0 && !children)) return null
  return (
    <Stack spacing={6}>
      <Heading as='h5' px={4}>
        {translate(label)}
      </Heading>
      <ScrollCarousel {...sliderProps}>
        {items.map(mission => (
          <Mission key={mission.title} {...mission} />
        ))}
        {children}
      </ScrollCarousel>
    </Stack>
  )
}

const MissionCarouselHeader: React.FC<CarouselHeaderProps> = ({ controls }) => {
  const translate = useTranslate()
  return (
    <Flex alignItems='center' justifyContent='space-between' width='full'>
      <Flex alignItems='center' gap={4}>
        <Heading as='h4' fontSize='md'>
          {translate('navBar.foxMissions')}
        </Heading>
        <Button as={NavLink} to='/missions' variant='link' colorScheme='blue'>
          {translate('common.viewAll')}
        </Button>
      </Flex>
      {controls}
    </Flex>
  )
}
const sideBarPadding = { base: 4, xl: 0 }
export const MissionSidebar = () => {
  const { active } = useGetMissions()
  const renderMissions = useMemo(() => {
    return active.map(mission => <Mission minHeight='250px' key={mission.title} {...mission} />)
  }, [active])
  return (
    <Card variant='unstyled' px={sideBarPadding}>
      <Carousel renderHeader={props => <MissionCarouselHeader {...props} />}>
        {renderMissions}
      </Carousel>
    </Card>
  )
}

const containerPadding = { base: 0, md: 6 }
const backgroundSize = { base: 'contain', md: 'cover' }
const backgroundPosition = { base: 'center -12em', md: 'center 110%' }
const headingFontSize = { base: '3xl', md: '5xl' }
const spanAfter = {
  content: 'attr(data-text)',
  position: 'absolute',
  left: 0,
  top: 0,
  textShadow: '0 4px 15px #000',
  zIndex: -1,
  display: { base: 'none', md: 'inline' },
}
const bodyFontSize = { base: 'xl', md: '2xl' }
export const Missions = () => {
  const missionData = useGetMissions()
  const translate = useTranslate()

  const renderMissions = useMemo(() => {
    return (
      <Container maxWidth='full' display='flex' flexDir='column' gap={12} px={containerPadding}>
        <MissionCarousel items={missionData.active} label='missions.activeMissions' />
        <MissionCarousel items={missionData.future} label='missions.comingSoon'>
          <Mission
            key='sponsored'
            title={translate('missions.getListed.title')}
            subtitle={translate('missions.getListed.subtitle')}
            onClick={() => window.open(FOX_MISSION_REQUEST_PAGE)}
            buttonText={translate('missions.getListed.cta')}
            coverImage={SponsorBg}
          />
        </MissionCarousel>
        <MissionCarousel items={missionData.past} label='missions.endedMissions' />
      </Container>
    )
  }, [missionData, translate])
  return (
    <DarkMode>
      <SEO title={translate('missions.subtitle')} />
      <Main
        pt={0}
        px={0}
        pb={12}
        display='flex'
        flexDir='column'
        flex={1}
        width='full'
        hideBreadcrumbs
      >
        <Box
          mt='-4.5rem'
          bgImage={FoxMissionsBg}
          backgroundSize={backgroundSize}
          backgroundRepeat='no-repeat'
          backgroundPosition={backgroundPosition}
          pt='22%'
        >
          <Container textAlign='center' maxWidth='container.md' py={16}>
            <Heading textShadow='0 2px rgba(0,0,0,.4)' as='h4' color='white'>
              {translate('missions.subtitle')}
            </Heading>
            <Heading
              color='white'
              fontSize={headingFontSize}
              lineHeight='none'
              letterSpacing='-0.015em'
            >
              <chakra.span textShadow='0 4px 15px #000'>
                {translate('missions.title.1')}{' '}
              </chakra.span>
              <chakra.span
                backgroundImage='linear-gradient(97.53deg, #F7F2F4 5.6%, #7B61FF 59.16%, #46F4C8 119.34%)'
                backgroundClip='text'
                data-text={translate('missions.title.2')}
                position='relative'
                zIndex='1'
                _after={spanAfter}
              >
                {translate('missions.title.2')}
              </chakra.span>
            </Heading>
            <RawText
              textShadow='0 3px rgba(0,0,0,.4)'
              fontSize={bodyFontSize}
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
