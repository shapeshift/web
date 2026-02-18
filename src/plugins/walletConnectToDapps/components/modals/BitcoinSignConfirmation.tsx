import { Box, Button, Card, Divider, HStack, Image, VStack } from '@chakra-ui/react'
import type { FC, JSX } from 'react'
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
  BIP122SendTransferCallRequest,
  BIP122SendTransferCallRequestParams,
  BIP122SignMessageCallRequest,
  BIP122SignMessageCallRequestParams,
  BIP122SignPsbtCallRequest,
  BIP122SignPsbtCallRequestParams,
} from '@/plugins/walletConnectToDapps/types'
import { BIP122SigningMethod } from '@/plugins/walletConnectToDapps/types'
import type { WalletConnectRequestModalProps } from '@/plugins/walletConnectToDapps/WalletConnectModalManager'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

export const BitcoinSignConfirmationModal: FC<
  WalletConnectRequestModalProps<
    BIP122SendTransferCallRequest | BIP122SignPsbtCallRequest | BIP122SignMessageCallRequest
  >
> = ({ onConfirm, onReject, state, topic }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { address, chainId } = useWalletConnectState(state)
  const peerMetadata = state.sessionsByTopic[topic]?.peer.metadata

  const connectedAccountFeeAsset = useAppSelector(s => selectFeeAssetByChainId(s, chainId ?? ''))

  const translate = useTranslate()
  const walletInfo = useWallet().state.walletInfo
  const WalletIcon = walletInfo?.icon ?? FoxIcon
  const walletIcon = useMemo(
    () => (typeof WalletIcon === 'string' ? null : <WalletIcon w='full' h='full' />),
    [WalletIcon],
  )
  const request = state.modalData.requestEvent?.params.request

  const handleConfirm = useCallback(async () => {
    try {
      setIsLoading(true)
      await onConfirm()
    } finally {
      setIsLoading(false)
    }
  }, [onConfirm])

  const handleReject = useCallback(async () => {
    try {
      setIsLoading(true)
      await onReject()
    } finally {
      setIsLoading(false)
    }
  }, [onReject])

  const methodSpecificContent: JSX.Element | null = useMemo(() => {
    if (request?.method === BIP122SigningMethod.BIP122_SIGN_MESSAGE) {
      const { message } = request.params as BIP122SignMessageCallRequestParams
      return (
        <Box p={4}>
          <Text
            translation='plugins.walletConnectToDapps.modal.signMessage.message'
            fontWeight='medium'
            mb={1}
          />
          <RawText fontWeight='medium' color='text.subtle'>
            {message}
          </RawText>
        </Box>
      )
    }
    if (request?.method === BIP122SigningMethod.BIP122_SEND_TRANSFER) {
      const { recipientAddress, amount, memo } =
        request.params as BIP122SendTransferCallRequestParams
      return (
        <Box p={4}>
          <Text
            translation='plugins.walletConnectToDapps.modal.sendTransaction.recipientAddress'
            fontWeight='medium'
            mb={1}
          />
          <RawText fontWeight='medium' color='text.subtle'>
            {recipientAddress}
          </RawText>
          <Text
            translation='plugins.walletConnectToDapps.modal.sendTransaction.amount'
            fontWeight='medium'
            mb={1}
            mt={2}
          />
          <RawText fontWeight='medium' color='text.subtle'>
            {translate('plugins.walletConnectToDapps.modal.sendTransaction.amountSats', {
              amount,
            })}
          </RawText>
          {memo && (
            <>
              <Text
                translation='plugins.walletConnectToDapps.modal.signMessage.memo'
                fontWeight='medium'
                mb={1}
                mt={2}
              />
              <RawText fontWeight='medium' color='text.subtle'>
                {memo}
              </RawText>
            </>
          )}
        </Box>
      )
    }
    if (request?.method === BIP122SigningMethod.BIP122_SIGN_PSBT) {
      const { psbt, broadcast } = request.params as BIP122SignPsbtCallRequestParams
      const truncatedPsbt = psbt.length > 100 ? `${psbt.slice(0, 100)}...` : psbt
      return (
        <Box p={4}>
          <Text
            translation='plugins.walletConnectToDapps.modal.sendTransaction.psbt'
            fontWeight='medium'
            mb={1}
          />
          <RawText fontWeight='medium' color='text.subtle' wordBreak='break-all'>
            {truncatedPsbt}
          </RawText>
          <RawText fontWeight='medium' mb={1} mt={2}>
            {translate('plugins.walletConnectToDapps.modal.sendTransaction.broadcast')}
          </RawText>
          <RawText fontWeight='medium' color='text.subtle'>
            {translate(broadcast ? 'common.yes' : 'common.no')}
          </RawText>
        </Box>
      )
    }
    return null
  }, [request?.method, request?.params, translate])

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
            <Image borderRadius='full' boxSize='24px' src={peerMetadata.icons?.[0]} alt='' />
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
