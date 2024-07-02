import {
  Box,
  Button,
  Input,
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
import { type ChainId, toAccountId } from '@shapeshiftoss/caip'
import type { AccountMetadataById } from '@shapeshiftoss/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { ChainDropdown } from 'components/ChainDropdown/ChainDropdown'
import { RawText } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { portfolio, portfolioApi } from 'state/slices/portfolioSlice/portfolioSlice'
import { selectAssets, selectWalletConnectedChainIdsSorted } from 'state/slices/selectors'
import { useAppDispatch } from 'state/store'

const chainDropdownButtonProps = { width: 'full' }

export const AddAccountModal = () => {
  const translate = useTranslate()
  const toast = useToast()
  const dispatch = useAppDispatch()

  const {
    state: { wallet, deviceId: walletDeviceId },
  } = useWallet()

  const assets = useSelector(selectAssets)
  const chainIds = useSelector(selectWalletConnectedChainIdsSorted)

  const firstChainId = useMemo(() => chainIds[0], [chainIds])

  const [selectedChainId, setSelectedChainId] = useState<ChainId | undefined>(firstChainId)
  const [inputAddress, setInputAddress] = useState<string>()

  console.log({ inputAddress })

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

    const adapter = getChainAdapterManager().get(selectedChainId)
    const address = inputAddress
    if (!address || !adapter) return
    const bip44Params = adapter.getBIP44Params({ accountNumber: 1337 })
    const accountId = toAccountId({ chainId: selectedChainId, account: address })
    const accountMetadataByAccountId: AccountMetadataById = {
      [accountId]: {
        isViewOnly: true,
        bip44Params,
      },
    }

    dispatch(
      portfolio.actions.upsertAccountMetadata({
        accountMetadataByAccountId,
        walletId: walletDeviceId,
      }),
    )

    const accountIds = Object.keys(accountMetadataByAccountId)
    const { getAccount } = portfolioApi.endpoints
    const opts = { forceRefetch: true }
    accountIds.forEach(accountId => {
      dispatch(getAccount.initiate({ accountId, upsertOnFetch: true }, opts))
      dispatch(portfolio.actions.enableAccountId(accountId))
    })
    const assetId = getChainAdapterManager().get(selectedChainId)!.getFeeAssetId()
    const { name } = assets[assetId] ?? {}
    toast({
      position: 'top-right',
      title: translate('accounts.newAccountAdded', { name }),
      description: translate('accounts.youCanNowUse', { name, accountNumber: 0 }),
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
    close()
  }, [
    assets,
    close,
    dispatch,
    inputAddress,
    selectedChainId,
    toast,
    translate,
    wallet,
    walletDeviceId,
  ])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setInputAddress(e.target.value),
    [],
  )

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
                chainIds={chainIds}
                chainId={selectedChainId}
                onClick={setSelectedChainId}
                matchWidth
                buttonProps={chainDropdownButtonProps}
              />
              <Input onChange={handleInputChange} />
            </Box>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme='blue' width='full' onClick={handleAddAccount}>
            {translate('accounts.addAccount')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
