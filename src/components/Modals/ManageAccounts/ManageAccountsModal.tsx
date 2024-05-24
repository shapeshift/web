import { InfoIcon } from '@chakra-ui/icons'
import {
  Button,
  Flex,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Tag,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { isLedger } from '@shapeshiftoss/hdwallet-ledger'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { LazyLoadAvatar } from 'components/LazyLoadAvatar'
import { ManageAccountsDrawer } from 'components/ManageAccountsDrawer/ManageAccountsDrawer'
import { RawText } from 'components/Text'
import { availableLedgerChainIds } from 'context/WalletProvider/Ledger/constants'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { assertGetChainAdapter, chainIdToFeeAssetId } from 'lib/utils'
import { selectWalletSupportedChainIds } from 'state/slices/common-selectors'
import {
  selectAccountIdsByChainId,
  selectAssetById,
  selectWalletConnectedChainIdsSorted,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const infoIcon = <InfoIcon />
const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

const ConnectedChain = ({
  chainId,
  onClick,
}: {
  chainId: ChainId
  onClick: (chainId: ChainId) => void
}) => {
  const accountIdsByChainId = useAppSelector(selectAccountIdsByChainId)
  const numAccounts = accountIdsByChainId[chainId]?.length ?? 0

  const feeAssetId = chainIdToFeeAssetId(chainId)
  const feeAsset = useAppSelector(state => selectAssetById(state, feeAssetId ?? ''))
  const handleClick = useCallback(() => onClick(chainId), [chainId, onClick])

  const chainAdapter = useMemo(() => {
    return assertGetChainAdapter(chainId)
  }, [chainId])

  if (numAccounts === 0 || !feeAsset) return null
  return (
    <Button width='full' height='auto' onClick={handleClick} p={2} pr={3}>
      <Flex justifyContent='space-between' width='full' alignItems='center'>
        <HStack>
          <LazyLoadAvatar src={feeAsset.networkIcon ?? feeAsset.icon} size='sm' />
          <RawText>{chainAdapter.getDisplayName()}</RawText>
        </HStack>
        <Tag>{numAccounts}</Tag>
      </Flex>
    </Button>
  )
}

export const ManageAccountsModal = () => {
  const translate = useTranslate()
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null)
  const { close, isOpen } = useModal('manageAccounts')
  const {
    isOpen: isDrawerOpen,
    onOpen: handleDrawerOpen,
    onClose: handleDrawerClose,
  } = useDisclosure()
  const wallet = useWallet().state.wallet

  const handleInfoClick = useCallback(() => {
    console.log('info clicked')
  }, [])

  const walletConnectedChainIdsSorted = useAppSelector(selectWalletConnectedChainIdsSorted)
  const walletSupportedChainIds = useAppSelector(selectWalletSupportedChainIds)
  const availableChainIds = useMemo(() => {
    // If a Ledger is connected, we have the option to add additional chains that are not currently "supported" by the HDWallet
    return wallet && isLedger(wallet) ? availableLedgerChainIds : walletSupportedChainIds
  }, [wallet, walletSupportedChainIds])

  const handleClickChain = useCallback(
    (chainId: ChainId) => {
      setSelectedChainId(chainId)
      handleDrawerOpen()
    },
    [handleDrawerOpen],
  )

  const handleClickAddChain = useCallback(() => {
    setSelectedChainId(null)
    handleDrawerOpen()
  }, [handleDrawerOpen])

  const connectedChains = useMemo(() => {
    return walletConnectedChainIdsSorted.map(chainId => {
      return <ConnectedChain key={chainId} chainId={chainId} onClick={handleClickChain} />
    })
  }, [handleClickChain, walletConnectedChainIdsSorted])

  const disableAddChain = walletConnectedChainIdsSorted.length >= availableChainIds.length

  return (
    <>
      <ManageAccountsDrawer
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
        chainId={selectedChainId}
      />
      <Modal isOpen={isOpen} onClose={close} isCentered size='md'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader textAlign='left' pt={14}>
            <RawText as='h3' fontWeight='semibold'>
              {translate('accountManagement.manageAccounts.title')}
            </RawText>
            <RawText color='text.subtle' fontSize='md' fontWeight='normal'>
              {walletConnectedChainIdsSorted.length === 0
                ? translate('accountManagement.manageAccounts.emptyList')
                : translate('accountManagement.manageAccounts.description')}
            </RawText>
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
          {walletConnectedChainIdsSorted.length > 0 && (
            <ModalBody maxH='400px' overflowY='auto'>
              <VStack spacing={2} width='full'>
                {connectedChains}
              </VStack>
            </ModalBody>
          )}
          <ModalFooter justifyContent='center' pb={6}>
            <VStack spacing={2} width='full'>
              <Button
                colorScheme='blue'
                onClick={handleClickAddChain}
                width='full'
                size='lg'
                isLoading={isDrawerOpen}
                isDisabled={disableAddChain}
                _disabled={disabledProp}
              >
                {walletConnectedChainIdsSorted.length === 0
                  ? translate('accountManagement.manageAccounts.addChain')
                  : translate('accountManagement.manageAccounts.addAnotherChain')}
              </Button>
              <Button
                size='lg'
                colorScheme='gray'
                onClick={close}
                isDisabled={isDrawerOpen}
                width='full'
              >
                {translate('common.done')}
              </Button>
            </VStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
