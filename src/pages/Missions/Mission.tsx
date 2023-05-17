import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Box, Button, Flex, Heading, useColorModeValue } from '@chakra-ui/react'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import React, { useCallback } from 'react'
import { FaClock } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { RawText } from 'components/Text'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'

dayjs.extend(customParseFormat)
const promoDateFormat = 'YYYY-MM-DD hh:mm A'

export type MissionProps = {
  title: string
  subtitle?: string
  coverImage: string
  image: string
  onClick: () => void
  buttonText: string
  endDate?: string
}

export const Mission: React.FC<MissionProps> = ({
  title,
  subtitle,
  coverImage,
  buttonText,
  onClick,
  endDate,
}) => {
  const translate = useTranslate()
  const handleClick = useCallback(() => {
    getMixPanel()?.track(`${title} mission click`)
    onClick()
  }, [onClick, title])
  return (
    <Card
      flexDir={{ base: 'column', md: 'row' }}
      display='flex'
      bgImage={coverImage}
      backgroundPosition={{ base: '-10% -50%', md: '150% 60%' }}
      backgroundSize={{ base: 'cover', md: '80%' }}
      backgroundRepeat='no-repeat'
      borderColor={useColorModeValue('blackAlpha.100', 'whiteAlpha.100')}
    >
      <Card.Body py={12} px={8}>
        <Flex gap={2} color='gray.500'>
          <FaClock />
          <RawText variant='sub-text' size='xs'>
            {endDate
              ? `${translate('missions.ends')} ${dayjs(endDate, promoDateFormat).fromNow()}`
              : translate('missions.ongoing')}
          </RawText>
        </Flex>

        <Heading>{title}</Heading>
        <Heading as='h6' textTransform='uppercase' color='gray.500' letterSpacing='0.02em'>
          {subtitle}
        </Heading>

        <Button colorScheme='blue' onClick={handleClick} rightIcon={<ArrowForwardIcon />} mt={8}>
          {buttonText}
        </Button>
      </Card.Body>
      <Box width='50%' minHeight='150px' />
    </Card>
  )
}
