import { InfoIcon } from '@chakra-ui/icons'
import { Flex } from '@chakra-ui/react'
import React from 'react'
import { Text } from 'components/Text'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'

export type AwaitKeepKeyProps = {
  children?: React.ReactNode
  setting: string
}

export const AwaitKeepKey = ({ children, setting }: AwaitKeepKeyProps) => {
  const { state } = useKeepKey()

  return state.awaitingButtonPress ? (
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
