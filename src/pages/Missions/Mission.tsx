import { ArrowForwardIcon, InfoIcon } from '@chakra-ui/icons'
import type { ResponsiveValue } from '@chakra-ui/react'
import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  Heading,
  Tag,
  TagLabel,
  TagRightIcon,
  useColorModeValue,
} from '@chakra-ui/react'
import type { Property } from 'csstype'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import type { MouseEvent } from 'react'
import React, { useCallback, useMemo, useState } from 'react'
import { FaClock } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { IconCircle } from 'components/IconCircle'
import { RawText } from 'components/Text'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { selectSelectedLocale } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

dayjs.extend(timezone)
dayjs.extend(customParseFormat)
// Timezone is MST for dates
dayjs.tz.setDefault('America/Denver')
const dateFormat = 'YYYY-MM-DD hh:mm A'

export type MissionProps = {
  title: string
  subtitle?: string
  coverImage?: string
  onClick?: () => void
  buttonText: string
  endDate?: string
  startDate?: string
  colspan?: number
  minHeight?: string
}

const buttonLeftIcon = (
  <IconCircle
    bg='white'
    color='black'
    className='icon-btn'
    transitionProperty='common'
    transitionDuration='normal'
  >
    <ArrowForwardIcon />
  </IconCircle>
)
const cardBorderRadius = { base: 'xl', lg: '2xl', xl: '2xl' }
const cardBackgroundPosition = { base: 'center', md: 'center bottom' }
const headingFontSize = { base: 'xl', md: '3xl' }
const footerFlexBefore = {
  content: '""',
  width: '100%',
  height: '100%',
  left: 0,
  bottom: 0,
  position: 'absolute',
  backdropFilter: 'blur(50px)',
  mask: 'linear-gradient(transparent, black 85%)',
  borderBottomRadius: {
    base: 'xl',
    lg: '2xl',
  },
}
const footerAlignItems = { base: 'flex-start', lg: 'center' }
const footerFlexDir: ResponsiveValue<Property.FlexDirection> = { base: 'column', lg: 'row' }
const boxBorderBottomRadius = { base: 'xl', lg: '2xl' }

export const Mission: React.FC<MissionProps> = ({
  title,
  subtitle,
  coverImage,
  buttonText,
  onClick,
  endDate,
  startDate,
  minHeight = '350px',
  colspan = 1,
}) => {
  const [isActive, setIsActive] = useState(false)
  const translate = useTranslate()
  const selectedLocale = useAppSelector(selectSelectedLocale)
  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (e?.defaultPrevented) return
      getMixPanel()?.track('mission click', { mission: title })
      onClick && onClick()
    },
    [onClick, title],
  )

  const renderFooter = useMemo(() => {
    const start = dayjs(startDate, dateFormat)
    const end = dayjs(endDate, dateFormat)
    const now = dayjs()
    if (now.isBefore(start)) {
      setIsActive(false)
      return (
        <>
          <Tag>
            <TagLabel>{translate('missions.comingSoon')}</TagLabel>
            <TagRightIcon as={InfoIcon} />
          </Tag>
        </>
      )
    } else {
      setIsActive(true)
      const isEnded = now.isAfter(end)
      return (
        <>
          <Button
            variant='unstyled'
            onClick={handleClick}
            iconSpacing={3}
            className='mission-btn'
            whiteSpace={'normal'}
            display={'inline-flex'}
            textAlign={'left'}
            lineHeight={'none'}
            leftIcon={buttonLeftIcon}
          >
            {isEnded ? translate('missions.viewMission') : buttonText}
          </Button>
          <Flex gap={2} fontWeight='semibold' alignItems='center'>
            <FaClock />
            {isEnded ? (
              <RawText>{translate('missions.missionEnded')}</RawText>
            ) : (
              <RawText lineHeight='none'>
                {endDate
                  ? `${translate('missions.ends')} ${dayjs(endDate, dateFormat)
                      .locale(selectedLocale)
                      .fromNow()}`
                  : translate('missions.ongoing')}
              </RawText>
            )}
          </Flex>
        </>
      )
    }
  }, [buttonText, endDate, handleClick, selectedLocale, startDate, translate])

  const boxMinHeight = useMemo(
    () => ({ base: `calc(${minHeight} / 2)`, md: minHeight }),
    [minHeight],
  )

  return (
    <Card
      display='flex'
      flex={1}
      flexDirection='column'
      boxShadow='lg'
      borderWidth={useColorModeValue(0, 1)}
      gridColumn={`span ${colspan}`}
      borderRadius={cardBorderRadius}
      transitionProperty='common'
      transitionDuration='normal'
      position='relative'
      bgImage={coverImage}
      backgroundSize='cover'
      backgroundRepeat='no-repeat'
      backgroundPosition={cardBackgroundPosition}
      borderColor={useColorModeValue('blackAlpha.100', 'whiteAlpha.100')}
      {...(isActive
        ? {
            onClick: handleClick,
            _hover: {
              cursor: 'pointer',
              boxShadow: 'xl',
              '.mission-btn': { color: 'whiteAlpha.500' },
              '.icon-btn': { bg: 'whiteAlpha.500' },
            },
          }
        : {})}
    >
      <CardBody pt={8} px={8} display='flex' flexDir='column' alignItems='center'>
        <Heading
          as='h6'
          textTransform='uppercase'
          color='whiteAlpha.700'
          letterSpacing='0.02em'
          textAlign='center'
        >
          {subtitle}
        </Heading>
        <Heading
          fontSize={headingFontSize}
          fontWeight='semibold'
          letterSpacing='-0.002em'
          textAlign='center'
          lineHeight='shorter'
          color='white'
          mx={8}
        >
          {title}
        </Heading>
        <Flex
          position='absolute'
          right='-1px'
          left='-1px'
          bottom='-1px'
          p={6}
          height='200px'
          justifyContent='space-between'
          alignItems='flex-end'
          _before={footerFlexBefore}
        >
          <Flex
            alignItems={footerAlignItems}
            color='white'
            width='full'
            justifyContent='space-between'
            zIndex='1'
            gap={6}
            flexDir={footerFlexDir}
          >
            {renderFooter}
          </Flex>
        </Flex>
      </CardBody>
      <Box
        width='100%'
        minHeight={boxMinHeight}
        mt='auto'
        backgroundPosition='center 100%'
        backgroundRepeat='no-repeat'
        borderBottomRadius={boxBorderBottomRadius}
      />
    </Card>
  )
}
