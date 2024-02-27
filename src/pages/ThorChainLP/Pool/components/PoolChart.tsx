import { Button, ButtonGroup, Center, Flex, Stack } from '@chakra-ui/react'
import { FaChartSimple } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { RawText } from 'components/Text'

export const PoolChart = () => {
  const translate = useTranslate()
  return (
    <Stack>
      <Flex justifyContent='space-between'>
        <ButtonGroup size='sm' isDisabled>
          <Button>Volume</Button>
          <Button>Liquidity</Button>
        </ButtonGroup>
        <ButtonGroup size='sm' isDisabled>
          <Button>1M</Button>
          <Button>1W</Button>
          <Button>All</Button>
        </ButtonGroup>
      </Flex>
      <Center
        flex={1}
        width='full'
        height='full'
        color='text.subtlest'
        flexDir='column'
        gap={4}
        fontSize='4xl'
      >
        <FaChartSimple />
        <RawText fontSize='md'>{translate('common.comingSoon')}</RawText>
      </Center>
    </Stack>
  )
}
