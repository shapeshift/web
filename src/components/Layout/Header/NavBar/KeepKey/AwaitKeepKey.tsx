import { InfoIcon } from '@chakra-ui/icons'
import { FlexProps } from '@chakra-ui/layout'
import { Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
import Polyglot from 'node-polyglot'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'

export type AwaitKeepKeyProps = {
  translation: string | null | [string, number | Polyglot.InterpolationOptions]
  children?: React.ReactNode
} & FlexProps

export const AwaitKeepKey = ({ children, translation, ...props }: AwaitKeepKeyProps) => {
  const translate = useTranslate()
  const {
    setAwaitingButtonPress,
    state: { awaitingButtonPress, wallet }
  } = useWallet()
  const blueShade = useColorModeValue('blue.500', 'blue.200')

  const cancel = async () => {
    setAwaitingButtonPress(false)
    await wallet?.cancel()
  }

  return awaitingButtonPress ? (
    <Flex {...props}>
      <InfoIcon color={blueShade} mt={1} />
      <Box ml={3}>
        <Text translation={translation} mb={3} fontWeight='medium' color={blueShade} />
        <Button colorScheme='blue' variant='ghost-filled' onClick={cancel} size='sm'>
          {translate('common.cancel')}
        </Button>
      </Box>
    </Flex>
  ) : (
    <>{children}</>
  )
}
