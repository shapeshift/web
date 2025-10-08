import { Box, Button, Flex, HStack, Tag, VStack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import type { ImportAccountsRef } from './components/ImportAccounts'
import { ImportAccounts } from './components/ImportAccounts'
import { SelectChain } from './components/SelectChain'

import { LazyLoadAvatar } from '@/components/LazyLoadAvatar'
import { Dialog } from '@/components/Modal/components/Dialog'
import { DialogBackButton } from '@/components/Modal/components/DialogBackButton'
import { DialogBody } from '@/components/Modal/components/DialogBody'
import { DialogCloseButton } from '@/components/Modal/components/DialogCloseButton'
import { DialogFooter } from '@/components/Modal/components/DialogFooter'
import {
  DialogHeader,
  DialogHeaderLeft,
  DialogHeaderMiddle,
  DialogHeaderRight,
} from '@/components/Modal/components/DialogHeader'
import { DialogTitle } from '@/components/Modal/components/DialogTitle'
import { RawText } from '@/components/Text'
import { KeyManager } from '@/context/WalletProvider/KeyManager'
import { availableLedgerChainIds } from '@/context/WalletProvider/Ledger/constants'
import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from '@/hooks/useModal/useModal'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertGetChainAdapter, chainIdToFeeAssetId } from '@/lib/utils'
import { portfolio } from '@/state/slices/portfolioSlice/portfolioSlice'
import {
  selectAccountIdsByChainId,
  selectAssetById,
  selectFeeAssetByChainId,
  selectWalletConnectedChainIdsSorted,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const disabledProp = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }
const modalProps = { size: 'lg' }

const chainListMaxHeight = {
  base: '220px',
  md: '400px',
}

type ManageAccountsState =
  | { step: 'list' }
  | { step: 'selectChain' }
  | { step: 'importAccounts'; chainId: ChainId }

type StepHeaderProps = {
  title: string
  onBack?: () => void
  disableClose?: boolean
}

const StepHeader = ({ title, onBack, disableClose }: StepHeaderProps) => (
  <DialogHeader>
    {onBack && (
      <DialogHeaderLeft>
        <DialogBackButton onClick={onBack} />
      </DialogHeaderLeft>
    )}
    <DialogHeaderMiddle>
      <DialogTitle>{title}</DialogTitle>
    </DialogHeaderMiddle>
    <DialogHeaderRight>
      <DialogCloseButton isDisabled={disableClose} />
    </DialogHeaderRight>
  </DialogHeader>
)

type StepDescriptionProps = {
  children: string
}

const StepDescription = ({ children }: StepDescriptionProps) => (
  <VStack spacing={2} alignItems='flex-start' px={2} pb={4}>
    <RawText color='text.subtle' fontSize='md' fontWeight='normal' textAlign='center' w='full'>
      {children}
    </RawText>
  </VStack>
)

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

type ListStepProps = {
  onAddChain: () => void
  onClickChain: (chainId: ChainId) => void
  onClose: () => void
  onGoBack?: () => void
  connectedChains: React.ReactNode[]
  disableAddChain: boolean
  disableClose: boolean
  walletConnectedChainIdsSorted: ChainId[]
}

const ListStep = ({
  onAddChain,
  onClose,
  onGoBack,
  connectedChains,
  disableAddChain,
  disableClose,
  walletConnectedChainIdsSorted,
}: ListStepProps) => {
  const translate = useTranslate()
  return (
    <>
      <StepHeader
        title={translate('accountManagement.manageAccounts.title')}
        onBack={onGoBack}
        disableClose={disableClose}
      />
      <StepDescription>
        {walletConnectedChainIdsSorted.length === 0
          ? translate('accountManagement.manageAccounts.emptyList')
          : translate('accountManagement.manageAccounts.description')}
      </StepDescription>
      {walletConnectedChainIdsSorted.length > 0 && (
        <DialogBody maxHeight={chainListMaxHeight} overflowY='auto'>
          <Box mx={-4} px={4}>
            <VStack spacing={2} width='full'>
              {connectedChains}
            </VStack>
          </Box>
        </DialogBody>
      )}
      <DialogFooter>
        <VStack spacing={2} width='full' py={2} pt={4}>
          <Button
            colorScheme='blue'
            onClick={onAddChain}
            width='full'
            size='lg'
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
            onClick={onClose}
            isDisabled={disableClose}
            width='full'
          >
            {translate('common.done')}
          </Button>
        </VStack>
      </DialogFooter>
    </>
  )
}

type SelectChainStepProps = {
  onSelectChain: (chainId: ChainId) => void
  onBack: () => void
  onCancel: () => void
}

const SelectChainStep = ({ onSelectChain, onBack, onCancel }: SelectChainStepProps) => {
  const translate = useTranslate()
  return (
    <>
      <StepHeader title={translate('accountManagement.selectChain.title')} onBack={onBack} />
      <StepDescription>{translate('accountManagement.selectChain.description')}</StepDescription>
      <DialogBody>
        <SelectChain onSelectChainId={onSelectChain} />
      </DialogBody>
      <DialogFooter>
        <Flex width='full' justifyContent='flex-end'>
          <Button colorScheme='gray' onClick={onCancel}>
            {translate('common.cancel')}
          </Button>
        </Flex>
      </DialogFooter>
    </>
  )
}

type ImportAccountsStepProps = {
  chainId: ChainId
  chainNamespaceDisplayName: string
  importAccountsRef: React.RefObject<ImportAccountsRef | null>
  onBack: () => void
  onCommit: () => void
  onClose: () => void
}

const ImportAccountsStep = ({
  chainId,
  chainNamespaceDisplayName,
  importAccountsRef,
  onBack,
  onCommit,
  onClose,
}: ImportAccountsStepProps) => {
  const translate = useTranslate()
  return (
    <>
      <StepHeader
        title={translate('accountManagement.importAccounts.title', { chainNamespaceDisplayName })}
        onBack={onBack}
      />
      <StepDescription>{translate('accountManagement.importAccounts.description')}</StepDescription>
      <DialogBody>
        <ImportAccounts ref={importAccountsRef} chainId={chainId} onClose={onClose} />
      </DialogBody>
      <DialogFooter>
        <Flex width='full' justifyContent='flex-end'>
          <Button colorScheme='blue' onClick={onCommit}>
            {translate('common.done')}
          </Button>
        </Flex>
      </DialogFooter>
    </>
  )
}

type ManageAccountsModalProps = {
  onBack?: () => void
}

export const ManageAccountsModal = ({ onBack }: ManageAccountsModalProps) => {
  const [state, setState] = useState<ManageAccountsState>({ step: 'list' })
  const importAccountsRef = useRef<ImportAccountsRef>(null)
  const { close, isOpen } = useModal('manageAccounts')
  const { state: walletState } = useWallet()
  const { wallet, connectedType } = walletState
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')

  const walletConnectedChainIdsSorted = useAppSelector(selectWalletConnectedChainIdsSorted)
  const walletSupportedChainIds = useAppSelector(portfolio.selectors.selectWalletSupportedChainIds)
  const availableChainIds = useMemo(() => {
    return connectedType === KeyManager.Ledger ? availableLedgerChainIds : walletSupportedChainIds
  }, [connectedType, walletSupportedChainIds])

  const selectedChainId = state.step === 'importAccounts' ? state.chainId : undefined
  const asset = useAppSelector(appState =>
    selectedChainId ? selectFeeAssetByChainId(appState, selectedChainId) : undefined,
  )
  const chainNamespaceDisplayName = asset?.networkName ?? ''

  const handleClickChain = useCallback((chainId: ChainId) => {
    setState({ step: 'importAccounts', chainId })
  }, [])

  const handleClickAddChain = useCallback(() => {
    setState({ step: 'selectChain' })
  }, [])

  const handleBack = useCallback(() => {
    setState({ step: 'list' })
  }, [])

  const handleClose = useCallback(() => {
    setState({ step: 'list' })
    close()
  }, [close])

  const handleImportClose = useCallback(() => {
    setState({ step: 'list' })
  }, [])

  const handleCommit = useCallback(() => {
    if (importAccountsRef.current) {
      importAccountsRef.current.commit()
    }
    setState({ step: 'list' })
  }, [])

  const connectedChains = useMemo(() => {
    return walletConnectedChainIdsSorted.map(chainId => {
      return <ConnectedChain key={chainId} chainId={chainId} onClick={handleClickChain} />
    })
  }, [handleClickChain, walletConnectedChainIdsSorted])

  const disableAddChain = walletConnectedChainIdsSorted.length >= availableChainIds.length

  // don't allow users to close the modal until at least one chain is connected
  const disableClose = walletConnectedChainIdsSorted.length === 0

  const handleGoBack = useCallback(() => {
    onBack?.()
    close()
  }, [close, onBack])

  // no `wallet`, no accounts management. That would be a dead click if you were to try to connect accounts
  useEffect(() => {
    if (isLedgerReadOnlyEnabled && !wallet && isOpen) {
      close()
    }
  }, [isLedgerReadOnlyEnabled, wallet, isOpen, close])

  const stepContent = (() => {
    switch (state.step) {
      case 'list':
        return (
          <ListStep
            onAddChain={handleClickAddChain}
            onClickChain={handleClickChain}
            onClose={close}
            onGoBack={onBack ? handleGoBack : undefined}
            connectedChains={connectedChains}
            disableAddChain={disableAddChain}
            disableClose={disableClose}
            walletConnectedChainIdsSorted={walletConnectedChainIdsSorted}
          />
        )
      case 'selectChain':
        return (
          <SelectChainStep
            onSelectChain={handleClickChain}
            onBack={handleBack}
            onCancel={handleClose}
          />
        )
      case 'importAccounts':
        return (
          <ImportAccountsStep
            chainId={state.chainId}
            chainNamespaceDisplayName={chainNamespaceDisplayName}
            importAccountsRef={importAccountsRef}
            onBack={handleBack}
            onCommit={handleCommit}
            onClose={handleImportClose}
          />
        )
      default:
        return null
    }
  })()

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      isFullScreen={false}
      height='auto'
      modalProps={modalProps}
    >
      {stepContent}
    </Dialog>
  )
}
