import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Avatar,
  Box,
  Button,
  forwardRef,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
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
import type { ChainId } from '@keepkey/caip'
import { fromAccountId } from '@keepkey/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useDispatch, useSelector } from 'react-redux'
import { RawText } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useModal } from 'hooks/useModal/useModal'
import { useWallet } from 'hooks/useWallet/useWallet'
import { deriveAccountIdsAndMetadata } from 'lib/account/account'
import { accountSpecifiers } from 'state/slices/accountSpecifiersSlice/accountSpecifiersSlice'
import { portfolio } from 'state/slices/portfolioSlice/portfolioSlice'
import {
  selectAssets,
  selectMaybeNextAccountNumberByChainId,
  selectPortfolioChainIdsSortedFiat,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ChainOptionProps = {
  chainId: ChainId
  name: string
  icon: string
  setSelectedChainId: (chainId: ChainId) => void
}
const ChainOption = forwardRef<ChainOptionProps, 'button'>(
  ({ chainId, name, icon, setSelectedChainId }, ref) => (
    <MenuItemOption
      ref={ref}
      key={chainId}
      iconSpacing={0}
      onClick={() => setSelectedChainId(chainId)}
    >
      <Stack direction='row' spacing={0} ml={0}>
        <Avatar size='xs' src={icon} mr={3} />
        <RawText fontWeight='bold'>{name}</RawText>
      </Stack>
    </MenuItemOption>
  ),
)

export const AddAccountModal = () => {
  const translate = useTranslate()
  const toast = useToast()
  const dispatch = useDispatch()

  const {
    state: { wallet },
  } = useWallet()

  const assets = useSelector(selectAssets)
  const chainIds = useSelector(selectPortfolioChainIdsSortedFiat)

  const firstChainId = useMemo(() => chainIds[0], [chainIds])
  const [selectedChainId, setSelectedChainId] = useState<ChainId>(firstChainId)

  const filter = useMemo(() => ({ chainId: selectedChainId }), [selectedChainId])
  const [isAbleToAddAccount, nextAccountNumber] = useAppSelector(s =>
    selectMaybeNextAccountNumberByChainId(s, filter),
  )

  const { addAccount } = useModal()
  const { close, isOpen } = addAccount

  useEffect(() => {
    setSelectedChainId(chainIds[0])
  }, [chainIds])

  const menuOptions = useMemo(() => {
    const chainAdapterManager = getChainAdapterManager()
    return chainIds.map(chainId => {
      const assetId = chainAdapterManager.get(chainId)!.getFeeAssetId()
      const asset = assets[assetId]
      const { name, icon } = asset
      const key = chainId
      const chainOptionsProps = { chainId, setSelectedChainId, name, icon, key }
      return <ChainOption {...chainOptionsProps} />
    })
  }, [assets, chainIds])

  const asset = useMemo(() => {
    if (!selectedChainId) return
    return assets[getChainAdapterManager().get(selectedChainId)!.getFeeAssetId()]
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

      // TODO(0xdef1cafe): temporary transform for backwards compatibility until we kill accountSpecifiersSlice
      const accountSpecifiersPayload = Object.keys(accountMetadataByAccountId).map(accountId => {
        const { chainId, account } = fromAccountId(accountId)
        return { [chainId]: account }
      })
      dispatch(accountSpecifiers.actions.upsertAccountSpecifiers(accountSpecifiersPayload))
      dispatch(portfolio.actions.upsertAccountMetadata(accountMetadataByAccountId))
      const assetId = getChainAdapterManager().get(selectedChainId)!.getFeeAssetId()
      const { name } = assets[assetId]
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
  const { name, icon } = asset

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
              <RawText mt={-4} fontSize='sm' color='gray.500'>
                {translate('accounts.selectChain')}
              </RawText>
            </Stack>
            <Box pt={4} width='full'>
              <Menu matchWidth>
                <MenuButton
                  mb={4}
                  as={Button}
                  width='full'
                  variant='outline'
                  iconSpacing={0}
                  rightIcon={<ChevronDownIcon />}
                >
                  <Stack spacing={0} direction='row' alignItems='center'>
                    <Avatar size='xs' src={icon} mr={3} />
                    <RawText fontWeight='bold'>{name}</RawText>
                  </Stack>
                </MenuButton>
                <MenuList>
                  <MenuOptionGroup defaultValue='asc' type='radio'>
                    {menuOptions}
                  </MenuOptionGroup>
                </MenuList>
              </Menu>
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
            disabled={!isAbleToAddAccount}
            onClick={handleAddAccount}
          >
            {translate('accounts.addAccount')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
