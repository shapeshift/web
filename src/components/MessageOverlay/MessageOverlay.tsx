import { Box, Flex, Text } from '@chakra-ui/react'
import { IoSwapVertical } from 'react-icons/io5'
import { IconCircle } from 'components/IconCircle'

type MessageOverlayProps = {
  children: React.ReactNode
  title: string
  show: boolean
}

export const MessageOverlay = ({
  children,
  title,
  show = true,
}: MessageOverlayProps): JSX.Element =>
  show ? (
    <Box position='relative' borderRadius={{ base: 'none', md: 'xl' }} overflow='hidden'>
      <Box
        backdropFilter='blur(10px)'
        background='rgba(255, 255, 255, 0.01)'
        zIndex={2}
        position='absolute'
        right={0}
        bottom={0}
        width='100%'
        height='100%'
        borderRadius='xl'
      >
        <Flex
          direction='column'
          width='100%'
          height='100%'
          gap={4}
          justifyContent='center'
          alignItems='center'
          zIndex={3}
          position='absolute'
        >
          <IconCircle>
            <IoSwapVertical />
          </IconCircle>
          <Text fontSize='lg'>{title}</Text>
        </Flex>
      </Box>
      {children}
    </Box>
  ) : (
    <>{children}</>
  )
