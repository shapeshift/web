import { InfoIcon } from '@chakra-ui/icons'
import { Flex, useColorModeValue } from '@chakra-ui/react'
import React from 'react'
import { Text } from 'components/Text'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

export type AwaitKeepKeyProps = {
  children?: React.ReactNode
  setting: string
}

export const AwaitKeepKey = ({ children, setting }: AwaitKeepKeyProps) => {
  const { state } = useKeepKey()
  const { awaitingButtonPress } = state
  const blueShade = useColorModeValue('blue.500', 'blue.200')

  return awaitingButtonPress ? (
    <Flex>
      <InfoIcon color={blueShade} mt={1} />
      <Text
        translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
        ml={3}
        fontWeight='medium'
        color={blueShade}
      />
    </Flex>
  ) : (
    <>{children}</>
  )
}
