import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  useToast,
} from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { ChainDropdown } from 'components/AssetSearch/Chains/ChainDropdown'
import { RawText } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { deriveAccountIdsAndMetadata } from 'lib/account/account'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectAssets,
  selectMaybeNextAccountNumberByChainId,
  selectPortfolioChainIdsSortedUserCurrency,
} from 'state/slices/selectors'
import { useAppDispatch, useAppSelector } from 'state/store'

export const AddAccountModal = () => {
  const translate = useTranslate()
  const toast = useToast()
  const dispatch = useAppDispatch()

  const {
    state: { wallet },
  } = useWallet()

  const assets = useSelector(selectAssets)
  const chainIds = useSelector(selectPortfolioChainIdsSortedUserCurrency)

  const firstChainId = useMemo(() => chainIds[0], [chainIds])
  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>(firstChainId)
  const portfolioChainIds = useAppSelector(selectPortfolioChainIdsSortedUserCurrency)

  const filter = useMemo(() => ({ chainId: selectedChainId }), [selectedChainId])
  const [isAbleToAddAccount, nextAccountNumber] = useAppSelector(s =>
    selectMaybeNextAccountNumberByChainId(s, filter),
  )

  const { close, isOpen } = useModal('addAccount')

  useEffect(() => {
    setSelectedChainId(chainIds[0])
  }, [chainIds])

  const asset = useMemo(() => {
    if (!selectedChainId) return
    return assets?.[getChainAdapterManager().get(selectedChainId)!.getFeeAssetId()]
  }, [assets, selectedChainId])

  const handleAddAccount = useCallback(() => {
    if (!wallet) return
    if (!selectedChainId) return
    if (!nextAccountNumber) return
    ;(async () => {
      const accountNumber = nextAccountNumber
      const chainIds = [selectedChainId]
      const accountMetadataByAccountId = await deriveAccountIdsAndMetadata({
        accountNumber,
        chainIds,
        wallet,
      })

      const { getAccount } = portfolioApi.endpoints
      const opts = { forceRefetch: true }
      dispatch(portfolio.actions.upsertAccountMetadata(accountMetadataByAccountId))
      const accountIds = Object.keys(accountMetadataByAccountId)
      accountIds.forEach(accountId =>
        dispatch(getAccount.initiate({ accountId, upsertOnFetch: true }, opts)),
      )
      const assetId = getChainAdapterManager().get(selectedChainId)!.getFeeAssetId()
      const { name } = assets[assetId] ?? {}
      toast({
        position: 'top-right',
        title: translate('accounts.newAccountAdded', { name }),
        description: translate('accounts.youCanNowUse', { name, accountNumber }),
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
      close()
    })()
  }, [assets, close, dispatch, nextAccountNumber, selectedChainId, toast, translate, wallet])

  if (!asset) return null

  return (
    <Modal isOpen={isOpen} onClose={close} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader textAlign='center'>{translate('accounts.addAccount')}</ModalHeader>
        <ModalCloseButton />
        <ModalBody alignItems='center' justifyContent='center'>
          <Stack>
            <Stack spacing={0}>
              <RawText fontWeight='semibold'>{translate('accounts.accountChain')}</RawText>
              <RawText mt={4} fontSize='sm' color='text.subtle'>
                {translate('accounts.selectChain')}
              </RawText>
            </Stack>
            <Box pt={4} width='full'>
              <ChainDropdown
                chainIds={portfolioChainIds}
                chainId={selectedChainId}
                onClick={setSelectedChainId}
                matchWidth
                buttonProps={{ width: 'full' }}
              />
            </Box>
            {!isAbleToAddAccount && (
              <Alert size='sm'>
                <AlertIcon as={FaInfoCircle} />
                <AlertDescription>{translate('accounts.requiresPriorTxHistory')}</AlertDescription>
              </Alert>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button
            colorScheme='blue'
            width='full'
            isDisabled={!isAbleToAddAccount}
            onClick={handleAddAccount}
          >
            {translate('accounts.addAccount')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
