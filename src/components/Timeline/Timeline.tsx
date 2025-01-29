import { Center, Flex, Stack } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'

export const Timeline: React.FC<PropsWithChildren> = ({ children }) => {
  return <Stack spacing={0}>{children}</Stack>
}

const lastStyle = {
  '.seperator': { display: 'none' },
  '.marker': {
    bg: 'var(--chakra-colors-blue-500)',
  },
}

export const TimelineItem: React.FC<PropsWithChildren> = ({ children }) => {
  return (
    <Flex position='relative' gap={4} _last={lastStyle}>
      <Flex
        minHeight='1rem'
        alignItems='center'
        justifyContent='flex-start'
        flexDir='column'
        flex={0}
        pt='0.25rem'
        gap='0.25rem'
      >
        <Center
          flexShrink={0}
          borderRadius='full'
          boxSize='0.85rem'
          bg='border.base'
          className='marker'
        />
        <Flex minHeight='14px' alignItems='center' className='seperator' height='100%'>
          <Flex height='100%' borderLeftWidth={2} borderColor='border.bold' borderStyle='dotted' />
        </Flex>
      </Flex>
      <Flex flex={1}>{children}</Flex>
    </Flex>
  )
}
