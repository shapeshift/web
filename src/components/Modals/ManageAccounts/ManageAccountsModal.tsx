import { InfoIcon } from '@chakra-ui/icons'
import {
  Button,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { RawText } from 'components/Text'
import { useModal } from 'hooks/useModal/useModal'
import { chainIdToFeeAssetId } from 'lib/utils'
import { selectWalletSupportedChainIds } from 'state/slices/common-selectors'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

export type ManageAccountsModalProps = {
  title?: string
}

const infoIcon = <InfoIcon />

const ChainButton = ({ chainId }: { chainId: ChainId }) => {
  const feeAssetId = chainIdToFeeAssetId(chainId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))

  if (!feeAsset) return null

  return (
    <Button height='100px' width='100px'>
      <VStack direction='column'>
        <LazyLoadAvatar src={feeAsset.networkIcon ?? feeAsset.icon} size='sm' />
        <RawText>{feeAsset.symbol}</RawText>
      </VStack>
    </Button>
  )
}

export const ManageAccountsModal = ({
  title = 'manageAccounts.modalTitle',
}: ManageAccountsModalProps) => {
  const translate = useTranslate()
  const { close, isOpen } = useModal('manageAccounts')

  const handleInfoClick = useCallback(() => {
    console.log('info clicked')
  }, [])

  const walletSupportedChainIds = useAppSelector(selectWalletSupportedChainIds)

  const chainButtons = useMemo(() => {
    return walletSupportedChainIds.map(chainId => {
      return <ChainButton key={chainId} chainId={chainId} />
    })
  }, [walletSupportedChainIds])

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent borderRadius='xl' mx={3} maxW='400px'>
        <ModalHeader textAlign='center' py={12}>
          {translate(title)}
        </ModalHeader>
        <IconButton
          aria-label='Info'
          icon={infoIcon}
          variant='ghost'
          position='absolute'
          top={3}
          left={3}
          size='sm'
          onClick={handleInfoClick}
        />
        <ModalCloseButton position='absolute' top={3} right={3} />
        <ModalBody>
          <SimpleGrid columns={3} spacing={4} placeItems='center' height='100%'>
            {chainButtons}
          </SimpleGrid>
        </ModalBody>
        <ModalFooter justifyContent='center' pb={6}>
          <Button colorScheme='blue' onClick={close} width='full'>
            Done
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
