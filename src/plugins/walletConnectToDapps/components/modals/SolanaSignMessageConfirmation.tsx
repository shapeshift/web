import { Box, Button, Card, Divider, HStack, Image, VStack } from '@chakra-ui/react'
import type { FC } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import { FoxIcon } from '@/components/Icons/FoxIcon'
import { RawText, Text } from '@/components/Text'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { AddressSummaryCard } from '@/plugins/walletConnectToDapps/components/modals/AddressSummaryCard'
import { ExternalLinkButton } from '@/plugins/walletConnectToDapps/components/modals/ExternalLinkButtons'
import { ModalSection } from '@/plugins/walletConnectToDapps/components/modals/ModalSection'
import { useWalletConnectState } from '@/plugins/walletConnectToDapps/hooks/useWalletConnectState'
import type {
  SolanaSignAndSendTransactionCallRequest,
  SolanaSignMessageCallRequest,
  SolanaSignTransactionCallRequest,
} from '@/plugins/walletConnectToDapps/types'
import { SolanaSigningMethod } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

export const SolanaSignMessageConfirmationModal: FC<
  WalletConnectRequestModalProps<
    | SolanaSignTransactionCallRequest
    | SolanaSignAndSendTransactionCallRequest
    | SolanaSignMessageCallRequest
  >
> = ({ onConfirm, onReject, state, topic }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { address, chainId } = useWalletConnectState(state)
  const peerMetadata = state.sessionsByTopic[topic]?.peer.metadata

  const connectedAccountFeeAsset = useAppSelector(state =>
    selectFeeAssetByChainId(state, chainId ?? ''),
  )

  const translate = useTranslate()
  const walletInfo = useWallet().state.walletInfo
  const WalletIcon = walletInfo?.icon ?? FoxIcon
  const walletIcon = useMemo(
    () => (typeof WalletIcon === 'string' ? null : <WalletIcon w='full' h='full' />),
    [WalletIcon],
  )
  const request = state.modalData.requestEvent?.params.request

  const handleConfirm = useCallback(async () => {
    setIsLoading(true)
    await onConfirm()
    setIsLoading(false)
  }, [onConfirm])

  const handleReject = useCallback(async () => {
    setIsLoading(true)
    await onReject()
    setIsLoading(false)
  }, [onReject])

  const methodSpecificContent = useMemo(() => {
    if (
      request?.method === SolanaSigningMethod.SOLANA_SIGN_TRANSACTION ||
      request?.method === SolanaSigningMethod.SOLANA_SIGN_AND_SEND_TRANSACTION
    ) {
      const transaction = request.params.transaction
      const truncated =
        transaction.length > 200 ? `${transaction.substring(0, 200)}...` : transaction

      return (
        <Box p={4}>
          <Text
            translation='plugins.walletConnectToDapps.modal.signMessage.message'
            fontWeight='medium'
            mb={1}
          />
          <RawText
            fontWeight='medium'
            color='text.subtle'
            wordBreak='break-all'
            fontSize='sm'
            fontFamily='mono'
          >
            {truncated}
          </RawText>
        </Box>
      )
    }

    if (request?.method === SolanaSigningMethod.SOLANA_SIGN_MESSAGE) {
      const message = request.params.message

      return (
        <Box p={4}>
          <Text
            translation='plugins.walletConnectToDapps.modal.signMessage.message'
            fontWeight='medium'
            mb={1}
          />
          <RawText fontWeight='medium' color='text.subtle' wordBreak='break-all'>
            {message}
          </RawText>
        </Box>
      )
    }

    return null
  }, [request?.method, request?.params])

  if (!peerMetadata) return null

  return (
    <>
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.signingFrom'>
        <AddressSummaryCard
          address={address ?? ''}
          icon={walletIcon}
          explorerAddressLink={connectedAccountFeeAsset?.explorerAddressLink}
        />
      </ModalSection>
      <ModalSection title='plugins.walletConnectToDapps.modal.signMessage.requestFrom'>
        <Card borderRadius='md'>
          <HStack align='center' p={4}>
            <Image borderRadius='full' boxSize='24px' src={peerMetadata.icons?.[0]} />
            <RawText fontWeight='semibold' flex={1}>
              {peerMetadata.name}
            </RawText>
            <ExternalLinkButton href={peerMetadata.url} ariaLabel={peerMetadata.name} />
          </HStack>
          <Divider />
          {methodSpecificContent}
        </Card>
      </ModalSection>
      <Text
        fontWeight='medium'
        color='text.subtle'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />
      <VStack spacing={4}>
        <Button
          size='lg'
          width='full'
          colorScheme='blue'
          type='submit'
          onClick={handleConfirm}
          isDisabled={isLoading}
          _disabled={disabledProp}
          isLoading={isLoading}
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
        <Button
          size='lg'
          width='full'
          onClick={handleReject}
          isDisabled={isLoading}
          _disabled={disabledProp}
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </>
  )
}
