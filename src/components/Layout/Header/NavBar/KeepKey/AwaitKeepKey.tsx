import { InfoIcon } from '@chakra-ui/icons'
import { FlexProps } from '@chakra-ui/layout'
import { Box, Button, Flex, useColorModeValue } from '@chakra-ui/react'
import Polyglot from 'node-polyglot'
import React from 'react'
import { useTranslate } from 'react-polyglot'
import { Text } from 'components/Text'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

export type AwaitKeepKeyProps = {
  children?: React.ReactNode
  translation: string | null | [string, number | Polyglot.InterpolationOptions]
} & FlexProps

export const AwaitKeepKey = ({ children, translation, ...props }: AwaitKeepKeyProps) => {
  const translate = useTranslate()
  const { keepKeyWallet } = useKeepKey()
  const {
    state: { awaitingButtonPress }
  } = useKeepKey()
  const blueShade = useColorModeValue('blue.500', 'blue.200')

  const cancel = async () => {
    await keepKeyWallet?.cancel()
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
