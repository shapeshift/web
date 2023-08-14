import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Circle, Flex } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/system'
import { useTranslate } from 'react-polyglot'
import { Link } from 'react-router-dom'
import { DefiIcon } from 'components/Icons/DeFi'
import { Text } from 'components/Text'

type ResultsEmptyProp = {
  icon?: JSX.Element
  title?: string
  body?: string
  ctaHref?: string | null
}

export const ResultsEmpty: React.FC<ResultsEmptyProp> = ({
  icon = <DefiIcon boxSize='24px' color='purple.500' />,
  title = 'defi.noActivePositions',
  body = 'assets.assetCards.stakingBody',
  ctaHref,
}) => {
  const bgColor = useColorModeValue('gray.100', 'gray.750')
  const translate = useTranslate()
  return (
    <Flex p={6} textAlign='center' alignItems='center' width='full' flexDir='column' gap={4}>
      <Flex>
        <Circle bg={bgColor} size='40px'>
          {icon}
        </Circle>
      </Flex>
      <Flex alignItems='center' textAlign='center' flexDir='column' gap={2}>
        <Text fontWeight='bold' fontSize='lg' letterSpacing='0.02em' translation={title} />
        <Text color='text.subtle' letterSpacing='0.012em' translation={body} />
        {ctaHref && (
          <Button
            colorScheme='purple'
            as={Link}
            to={ctaHref}
            mt={4}
            rightIcon={<ArrowForwardIcon />}
          >
            {translate('defi.startEarning')}
          </Button>
        )}
      </Flex>
    </Flex>
  )
}
