import { ArrowForwardIcon } from '@chakra-ui/icons'
import { Button, Circle, Flex } from '@chakra-ui/react'
import { useColorModeValue } from '@chakra-ui/system'
import { useTranslate } from 'react-polyglot'
import { Link } from 'react-router-dom'
import { DefiIcon } from 'components/Icons/DeFi'
import { Text } from 'components/Text'

export const ResultsEmpty = () => {
  const bgColor = useColorModeValue('gray.100', 'gray.750')
  const translate = useTranslate()
  return (
    <Flex p={6} textAlign='center' alignItems='center' width='full' flexDir='column' gap={4}>
      <Flex>
        <Circle bg={bgColor} size='40px'>
          <DefiIcon boxSize='24px' color='purple.500' />
        </Circle>
      </Flex>
      <Flex alignItems='center' textAlign='center' flexDir='column' gap={2}>
        <Text
          fontWeight='bold'
          fontSize='lg'
          letterSpacing='0.02em'
          translation='defi.noActivePositions'
        />
        <Text
          color='gray.500'
          letterSpacing='0.012em'
          translation='assets.assetCards.stakingBody'
        />
        <Button
          colorScheme='purple'
          as={Link}
          to='/defi/earn'
          mt={4}
          rightIcon={<ArrowForwardIcon />}
        >
          {translate('defi.startEarning')}
        </Button>
      </Flex>
    </Flex>
  )
}
