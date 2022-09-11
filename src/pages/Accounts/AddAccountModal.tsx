import { ChevronDownIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Box,
  Button,
  forwardRef,
  Icon,
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
  useColorModeValue,
} from '@chakra-ui/react'
import { ChainId } from '@shapeshiftoss/caip'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useSelector } from 'react-redux'
import { RawText } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useModal } from 'hooks/useModal/useModal'
import { selectAssets } from 'state/slices/assetsSlice/selectors'
import { selectPortfolioChainIdsSortedFiat } from 'state/slices/selectors'

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

  const assets = useSelector(selectAssets)
  const chainIds = useSelector(selectPortfolioChainIdsSortedFiat)

  const firstChainId = useMemo(() => chainIds[0], [chainIds])
  const [selectedChainId, setSelectedChainId] = useState<ChainId>(firstChainId)
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
      const chainOptionsProps = { chainId, setSelectedChainId, name, icon }
      return <ChainOption {...chainOptionsProps} />
    })
  }, [assets, chainIds])

  const asset = useMemo(() => {
    if (!selectedChainId) return
    return assets[getChainAdapterManager().get(selectedChainId)!.getFeeAssetId()]
  }, [assets, selectedChainId])

  const handleAddAccount = useCallback(() => {
    close()
  }, [close])

  const noteColor = useColorModeValue('black', 'white')
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
            <Box bgColor='whiteAlpha.100' pl={4} pr={4} pb={2} borderRadius={8}>
              <Stack flexDirection='row' alignItems={'center'}>
                <Icon color='blue.400' as={FaInfoCircle} size='md' mr={3} />
                <RawText color={noteColor} fontSize='sm'>
                  {translate('accounts.requiresPriorTxHistory')}
                </RawText>
              </Stack>
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
