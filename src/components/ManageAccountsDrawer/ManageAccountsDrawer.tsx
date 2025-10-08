import { Button, Flex, IconButton } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaChevronLeft } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'

import type { ImportAccountsFooterState } from './components/ImportAccounts'
import { ImportAccounts } from './components/ImportAccounts'
import { SelectChain } from './components/SelectChain'

import { useFeatureFlag } from '@/hooks/useFeatureFlag/useFeatureFlag'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { assertUnreachable } from '@/lib/utils'
import { selectFeeAssetByChainId } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

const BackIcon = <FaChevronLeft />

const disabledProps = { opacity: 0.5, cursor: 'not-allowed', userSelect: 'none' }

export type ManageAccountsDrawerContent = {
  title: string
  description: string
  headerLeftContent?: ReactNode
  body: ReactNode
  footer: ReactNode
}

export type ManageAccountsDrawerProps = {
  isOpen: boolean
  chainId: ChainId | null
  onClose: () => void
}

type ManageAccountsStep = 'selectChain' | 'importAccounts'

export const ManageAccountsDrawer = ({
  isOpen,
  onClose,
  chainId: parentSelectedChainId,
}: ManageAccountsDrawerProps) => {
  const wallet = useWallet().state.wallet
  const isLedgerReadOnlyEnabled = useFeatureFlag('LedgerReadOnly')
  const [step, setStep] = useState<ManageAccountsStep>('selectChain')
  const [selectedChainId, setSelectedChainId] = useState<ChainId | null>(null)
  const [importFooterState, setImportFooterState] = useState<ImportAccountsFooterState | null>(null)

  const handleClose = useCallback(() => {
    if (parentSelectedChainId === null) {
      setStep('selectChain')
    }
    onClose()
  }, [onClose, parentSelectedChainId])

  const handleNext = useCallback(() => {
    if (!wallet) return
    switch (step) {
      case 'selectChain':
        setStep('importAccounts')
        break
      case 'importAccounts':
        handleClose()
        break
      default:
        assertUnreachable(step)
    }
  }, [wallet, step, handleClose])

  // Set the selected chainId from parent if required
  useEffect(() => {
    setSelectedChainId(parentSelectedChainId)
  }, [parentSelectedChainId])

  // Skip chain selection if chainId is already selected by parent
  useEffect(() => {
    if (step === 'selectChain' && parentSelectedChainId !== null) {
      handleNext()
    }
  }, [parentSelectedChainId, handleNext, step])

  useEffect(() => {
    if (parentSelectedChainId === null) {
      setStep('selectChain')
    }
  }, [parentSelectedChainId])

  useEffect(() => {
    // no `wallet`, no accounts management. That would be a dead click if you were to try to connect accounts
    if (isLedgerReadOnlyEnabled && !wallet && isOpen) {
      onClose()
    }
  }, [isLedgerReadOnlyEnabled, wallet, isOpen, onClose])

  const handleSelectChainId = useCallback(
    (chainId: ChainId) => {
      setSelectedChainId(chainId)
      handleNext()
    },
    [handleNext],
  )

  const handleBack = useCallback(() => {
    // If we're on import accounts, commit changes before going back
    if (step === 'importAccounts' && importFooterState?.handleCommit) {
      importFooterState.handleCommit()
    }
    setStep('selectChain')
  }, [step, importFooterState])

  const translate = useTranslate()
  const asset = useAppSelector(state =>
    selectedChainId ? selectFeeAssetByChainId(state, selectedChainId) : undefined,
  )
  const chainNamespaceDisplayName = asset?.networkName ?? ''

  const title = useMemo(() => {
    switch (step) {
      case 'selectChain':
        return translate('accountManagement.selectChain.title')
      case 'importAccounts':
        return translate('accountManagement.importAccounts.title', { chainNamespaceDisplayName })
      default:
        return ''
    }
  }, [step, translate, chainNamespaceDisplayName])

  const description = useMemo(() => {
    switch (step) {
      case 'selectChain':
        return translate('accountManagement.selectChain.description')
      case 'importAccounts':
        return translate('accountManagement.importAccounts.description')
      default:
        return ''
    }
  }, [step, translate])

  const headerLeftContent = useMemo(() => {
    if (step !== 'importAccounts') return undefined
    return (
      <IconButton
        aria-label='Back'
        icon={BackIcon}
        onClick={handleBack}
        variant='ghost'
        size='sm'
        mr={2}
      />
    )
  }, [step, handleBack])

  const footer = useMemo(() => {
    switch (step) {
      case 'selectChain':
        return (
          <Flex width='full' justifyContent='flex-end'>
            <Button colorScheme='gray' onClick={handleClose}>
              {translate('common.cancel')}
            </Button>
          </Flex>
        )
      case 'importAccounts':
        return (
          <Flex width='full' justifyContent='flex-end'>
            <Button
              colorScheme='blue'
              onClick={importFooterState?.handleCommit}
              isDisabled={
                importFooterState?.isSubmitting ||
                !importFooterState?.canCommit ||
                !importFooterState
              }
              _disabled={disabledProps}
            >
              {translate('common.done')}
            </Button>
          </Flex>
        )
      default:
        return null
    }
  }, [step, handleClose, translate, importFooterState])

  const body = useMemo(() => {
    switch (step) {
      case 'selectChain':
        return <SelectChain onSelectChainId={handleSelectChainId} />
      case 'importAccounts':
        if (!selectedChainId) return null
        return (
          <ImportAccounts
            chainId={selectedChainId}
            onClose={handleClose}
            setFooterState={setImportFooterState}
          />
        )
      default:
        return null
    }
  }, [step, handleSelectChainId, handleClose, selectedChainId])

  if (!isOpen) return null

  return {
    title,
    description,
    headerLeftContent,
    body,
    footer,
  }
}
