import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, Heading, useColorModeValue } from '@chakra-ui/react'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import React, { useCallback, useMemo, useState } from 'react'
import { FaClock } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { IconCircle } from 'components/IconCircle'
import { RawText } from 'components/Text'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'

dayjs.extend(customParseFormat)
const promoDateFormat = 'YYYY-MM-DD hh:mm A'

export type MissionProps = {
  title: string
  subtitle?: string
  coverImage?: string
  image: string
  onClick: () => void
  buttonText: string
  endDate?: string
  startDate?: string
  colspan?: number
}

export const Mission: React.FC<MissionProps> = ({
  title,
  subtitle,
  coverImage,
  buttonText,
  onClick,
  endDate,
  startDate,
  colspan = 1,
}) => {
  const [isActive, setisActive] = useState(false)
  const translate = useTranslate()
  const handleClick = useCallback(() => {
    getMixPanel()?.track(`${title} mission click`)
    onClick()
  }, [onClick, title])

  const renderFooter = useMemo(() => {
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    const now = dayjs()
    if (now.isBefore(start)) {
      setisActive(false)
      return <RawText>Coming Soon</RawText>
    } else {
      setisActive(true)
      const isEnded = now.isAfter(end)
      return (
        <>
          <Flex gap={2} fontWeight='semibold' alignItems='center'>
            <FaClock />
            {isEnded ? (
              <RawText>{translate('missions.missionEnded')}</RawText>
            ) : (
              <RawText lineHeight='none'>
                {endDate
                  ? `${translate('missions.ends')} ${dayjs(endDate, promoDateFormat).fromNow()}`
                  : translate('missions.ongoing')}
              </RawText>
            )}
          </Flex>
          <Button
            variant='unstyled'
            onClick={handleClick}
            iconSpacing={3}
            className='mission-btn'
            rightIcon={
              <IconCircle
                bg='white'
                color='black'
                className='icon-btn'
                transitionProperty='common'
                transitionDuration='normal'
              >
                <ArrowForwardIcon />
              </IconCircle>
            }
          >
            {isEnded ? translate('missions.viewMission') : buttonText}
          </Button>
        </>
      )
    }
  }, [buttonText, endDate, handleClick, startDate, translate])
  return (
    <Card
      display='flex'
      flex={1}
      flexDirection='column'
      boxShadow='lg'
      borderWidth={useColorModeValue(0, 1)}
      gridColumn={`span ${colspan}`}
      borderRadius={{ base: 'none', lg: '3xl', xl: '3xl' }}
      transitionProperty='common'
      transitionDuration='normal'
      position='relative'
      bgImage={coverImage}
      backgroundSize='cover'
      backgroundRepeat='no-repeat'
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
      <Card.Body pt={8} px={8} display='flex' flexDir='column' alignItems='center'>
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
          fontSize='3xl'
          fontWeight='semibold'
          letterSpacing='-0.002em'
          textAlign='center'
          lineHeight='10'
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
          _before={{
            content: '""',
            width: '100%',
            height: '100%',
            left: 0,
            bottom: 0,
            position: 'absolute',
            backdropFilter: 'blur(50px)',
            mask: 'linear-gradient(transparent, black 85%)',
            borderBottomRadius: {
              base: 'none',
              lg: '2xl',
            },
          }}
        >
          <Flex
            alignItems='center'
            color='white'
            width='full'
            justifyContent='space-between'
            zIndex='1'
          >
            {renderFooter}
          </Flex>
        </Flex>
      </Card.Body>
      <Box
        width='100%'
        minHeight='350px'
        mt='auto'
        backgroundPosition='center 100%'
        backgroundRepeat='no-repeat'
        borderBottomRadius={{ base: 'none', lg: '2xl' }}
      />
    </Card>
  )
}
