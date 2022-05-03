import { Alert, AlertIcon, useColorModeValue } from '@chakra-ui/react'
import { upperFirst } from 'lodash'
import { useTranslate } from 'react-polyglot'
import { useWallet } from 'hooks/useWallet/useWallet'

export type LastDeviceInteractionStatusProps = {
  setting: string
}

export const LastDeviceInteractionStatus = ({ setting }: LastDeviceInteractionStatusProps) => {
  const translate = useTranslate()
  const {
    state: {
      deviceState: { lastDeviceInteractionStatus },
    },
  } = useWallet()
  const greenShade = useColorModeValue('green.700', 'green.200')
  const yellowShade = useColorModeValue('yellow.500', 'yellow.200')

  return lastDeviceInteractionStatus ? (
    <Alert
      status={lastDeviceInteractionStatus}
      borderRadius='lg'
      mb={3}
      fontWeight='semibold'
      color={lastDeviceInteractionStatus === 'success' ? greenShade : yellowShade}
      fontSize='sm'
    >
      <AlertIcon color={lastDeviceInteractionStatus === 'success' ? greenShade : yellowShade} />
      {lastDeviceInteractionStatus === 'success'
        ? translate('walletProvider.keepKey.settings.descriptions.updateSuccess', {
            setting: upperFirst(setting),
          })
        : translate('walletProvider.keepKey.settings.descriptions.updateFailed', {
            setting,
          })}
    </Alert>
  ) : null
}
