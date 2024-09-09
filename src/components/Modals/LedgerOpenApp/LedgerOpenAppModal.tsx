import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  VStack,
} from '@chakra-ui/react'
import { type ChainId, ethAssetId } from '@shapeshiftoss/caip'
import { getLedgerAppName, isEvmChainId } from '@shapeshiftoss/chain-adapters'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { RawText } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { selectAssetById, selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetOnLedger } from './components/AssetOnLedger'

export type LedgerOpenAppModalProps = {
  chainId: ChainId
  onCancel: () => void
}

export const LedgerOpenAppModal = ({ chainId, onCancel }: LedgerOpenAppModalProps) => {
  const translate = useTranslate()
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, chainId))
  const ethAsset = useAppSelector(state => selectAssetById(state, ethAssetId))
  const { close: closeModal, isOpen } = useModal('ledgerOpenApp')

  const appName = useMemo(() => {
    return getLedgerAppName(chainId)
  }, [chainId])

  const appAsset = useMemo(() => {
    if (isEvmChainId(chainId)) return ethAsset
    return feeAsset
  }, [feeAsset, chainId, ethAsset])

  const handleClose = useCallback(() => {
    closeModal()
    onCancel()
  }, [closeModal, onCancel])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} isCentered size='md' closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign='left' pt={14}>
          <VStack spacing={2} width='full'>
            {appAsset ? <AssetOnLedger assetId={appAsset.assetId} size='lg' /> : null}
            <RawText as='h3' fontWeight='semibold'>
              {translate('ledgerOpenApp.title', {
                appName,
              })}
            </RawText>
          </VStack>
        </ModalHeader>
        <ModalBody>
          <VStack spacing={2}>
            <RawText color='whiteAlpha.600' textAlign='center'>
              {translate('ledgerOpenApp.description', {
                appName,
              })}
            </RawText>
            <Alert status='warning'>{translate('ledgerOpenApp.devicePrompt')}</Alert>
            <Spinner mt={4} size='lg' />
          </VStack>
        </ModalBody>
        <ModalFooter justifyContent='center' pb={6}>
          <VStack spacing={2} width='full'>
            <Button size='lg' colorScheme='gray' onClick={handleClose} width='full'>
              {translate('common.cancel')}
            </Button>
          </VStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
