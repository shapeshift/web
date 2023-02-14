import { Button, VStack } from '@chakra-ui/react'
import { AddressSummaryCard } from 'plugins/walletConnectToDapps/components/modals/AddressSummaryCard'
import { ModalSection } from 'plugins/walletConnectToDapps/components/modals/ModalSection'
import { TypedMessageInfo } from 'plugins/walletConnectToDapps/components/modals/TypedMessageInfo'
import {
  extractConnectedAccounts,
  getSignParamsMessage,
  getWalletAddressFromParams,
} from 'plugins/walletConnectToDapps/utils'
import type { WalletConnectRequestModalProps } from 'plugins/walletConnectToDapps/v2/WalletConnectModalManager'
import type { FC } from 'react'
import { useTranslate } from 'react-polyglot'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertIsDefined } from 'lib/utils'

export const SignTypedDataConfirmation: FC<WalletConnectRequestModalProps> = ({
  onConfirm: handleConfirm,
  onReject: handleReject,
  state: {
    modalData: { requestEvent },
    session,
  },
}) => {
  assertIsDefined(requestEvent)

  const translate = useTranslate()
  const walletInfo = useWallet().state.walletInfo
  const WalletIcon = walletInfo?.icon ?? FoxIcon

  const { params } = requestEvent
  const { request } = params

  const connectedAccounts = extractConnectedAccounts(session)
  const address = getWalletAddressFromParams(connectedAccounts, params)
  const message = getSignParamsMessage(request.params)

  return (
    <>
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.signingFrom'>
        <AddressSummaryCard address={address} icon={<WalletIcon w='full' h='full' />} />
      </ModalSection>
      <TypedMessageInfo typedData={request.params[1]} />
      <TypedMessageInfo typedData={message} />
      <Text
        fontWeight='medium'
        color='gray.500'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />
      <VStack spacing={4}>
        <Button size='lg' width='full' colorScheme='blue' type='submit' onClick={handleConfirm}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
        <Button size='lg' width='full' onClick={handleReject}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </>
  )
}
