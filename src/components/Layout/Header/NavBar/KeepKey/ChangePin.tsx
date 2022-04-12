import { Button, Flex } from '@chakra-ui/react'
import { useToast } from '@chakra-ui/toast'
import { useTranslate } from 'react-polyglot'
import { AwaitKeepKey } from 'components/Layout/Header/NavBar/KeepKey/AwaitKeepKey'
import { LastDeviceInteractionStatus } from 'components/Layout/Header/NavBar/KeepKey/LastDeviceInteractionStatus'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'
import { useKeepKey } from 'context/WalletProvider/KeepKeyProvider'
import { useWallet } from 'hooks/useWallet/useWallet'

import { SubMenuBody } from '../SubMenuBody'
import { SubMenuContainer } from '../SubMenuContainer'

export const ChangePin = () => {
  const translate = useTranslate()
  const { keepKeyWallet } = useKeepKey()
  const {
    state: { awaitingDeviceInteraction },
  } = useWallet()
  const toast = useToast()

  const handleChangePin = async () => {
    await keepKeyWallet?.changePin().catch(e => {
      console.error(e)
      toast({
        title: translate('common.error'),
        description: e?.message ?? translate('common.somethingWentWrong'),
        status: 'error',
        isClosable: true,
      })
    })
  }
  const setting = 'PIN'

  const renderPinState: JSX.Element = (() => {
    return (
      <>
        <SubMenuBody>
          <LastDeviceInteractionStatus setting={setting} />
          <Button
            colorScheme='blue'
            size='sm'
            onClick={handleChangePin}
            isLoading={awaitingDeviceInteraction}
          >
            {translate('walletProvider.keepKey.settings.actions.update', { setting })}
          </Button>
        </SubMenuBody>
        <AwaitKeepKey
          translation={['walletProvider.keepKey.settings.descriptions.buttonPrompt', { setting }]}
        />
      </>
    )
  })()

  return (
    <SubMenuContainer>
      <Flex flexDir='column'>
        <SubmenuHeader
          title={translate('walletProvider.keepKey.settings.headings.deviceSetting', {
            setting,
          })}
          description={translate('walletProvider.keepKey.settings.descriptions.pin')}
        />
        {renderPinState}
      </Flex>
    </SubMenuContainer>
  )
}
