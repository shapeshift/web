import { InfoIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/react'
import React from 'react'
import { useKeepKeyMenuEventHandler } from 'components/Layout/Header/NavBar/hooks/useKeepKeyMenuEventHandler'
import { Text } from 'components/Text'

export type AwaitKeepKeyProps = {
  children?: React.ReactNode
  setting: string
}

export const AwaitKeepKey = ({ children, setting }: AwaitKeepKeyProps) => {
  const { handleKeepKeyEvents, awaitingButtonPress } = useKeepKeyMenuEventHandler()
  handleKeepKeyEvents()

  return awaitingButtonPress ? (
    <Flex>
      <InfoIcon color='blue.200' mt={1} />
      <Text
        translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
        ml={3}
        fontWeight='medium'
        color='blue.200'
      />
    </Flex>
  ) : (
    <>{children}</>
  )
}
