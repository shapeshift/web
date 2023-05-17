import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, Heading, useColorModeValue } from '@chakra-ui/react'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import React, { useCallback } from 'react'
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
  colspan?: number
}

export const Mission: React.FC<MissionProps> = ({
  title,
  subtitle,
  coverImage,
  buttonText,
  onClick,
  endDate,
  colspan = 1,
}) => {
  const translate = useTranslate()
  const handleClick = useCallback(() => {
    getMixPanel()?.track(`${title} mission click`)
    onClick()
  }, [onClick, title])
  return (
    <Card
      display='flex'
      flex={1}
      flexDirection='column'
      boxShadow='lg'
      borderWidth={useColorModeValue(0, 1)}
      gridColumn={`span ${colspan}`}
      onClick={handleClick}
      transition='box-shadow 0.2s ease-in-out'
      _hover={{ cursor: 'pointer', boxShadow: 'xl' }}
      position='relative'
      backgroundPosition={{ base: '-10% -50%', md: '150% 60%' }}
      backgroundSize={{ base: 'cover', md: '80%' }}
      backgroundRepeat='no-repeat'
      borderColor={useColorModeValue('blackAlpha.100', 'whiteAlpha.100')}
    >
      <Card.Body pt={8} px={8} display='flex' flexDir='column' alignItems='center'>
        <Heading as='h6' textTransform='uppercase' color='gray.500' letterSpacing='0.02em'>
          {subtitle}
        </Heading>
        <Heading fontSize='3xl' fontWeight='semibold' letterSpacing='-0.002em'>
          {title}
        </Heading>
        <Flex
          position='absolute'
          right={0}
          bottom={0}
          p={6}
          width='full'
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
            mask: 'linear-gradient(transparent, black 60%)',
            borderBottomRadius: {
              base: 'none',
              lg: 'xl',
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
            <Flex gap={2} fontWeight='semibold' alignItems='center'>
              <FaClock />
              <RawText>
                {endDate
                  ? `${translate('missions.ends')} ${dayjs(endDate, promoDateFormat).fromNow()}`
                  : translate('missions.ongoing')}
              </RawText>
            </Flex>
            <Button
              variant='unstyled'
              onClick={handleClick}
              iconSpacing={3}
              _hover={{ color: 'whiteAlpha.500' }}
              rightIcon={
                <IconCircle bg='white' color='black'>
                  <ArrowForwardIcon />
                </IconCircle>
              }
            >
              {buttonText}
            </Button>
          </Flex>
        </Flex>
      </Card.Body>
      <Box
        width='100%'
        minHeight='350px'
        bgImage={coverImage}
        backgroundSize='200%'
        backgroundPosition='center 100%'
        backgroundRepeat='no-repeat'
        borderBottomRadius={{ base: 'none', lg: '2xl' }}
      />
    </Card>
  )
}
