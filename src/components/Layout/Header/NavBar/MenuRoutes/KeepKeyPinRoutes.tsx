import { Button, Flex } from '@chakra-ui/react'
import { useTranslate } from 'react-polyglot'
import { Route } from 'react-router-dom'
import { WalletConnectedRoutes } from 'components/Layout/Header/NavBar/hooks/useMenuRoutes'
import { SubmenuHeader } from 'components/Layout/Header/NavBar/SubmenuHeader'

export const KeepKeyPinRoutes = () => {
  const translate = useTranslate()
  const changePin = () => {
    return (
      <Flex flexDir='column' ml={3} mr={3} mb={3}>
        <SubmenuHeader
          title={translate('walletProvider.keepKey.settings.headings.devicePin')}
          description={translate('walletProvider.keepKey.settings.descriptions.pin')}
        />
        <Button colorScheme='blue' size='sm'>
          {translate('walletProvider.keepKey.settings.actions.updatePin')}
        </Button>
      </Flex>
    )
  }

  return (
    <>
      <Route exact path={WalletConnectedRoutes.KeepKeyPin} component={changePin} />
    </>
  )
}
