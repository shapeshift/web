import {
  Box,
  Button,
  Checkbox,
  Heading,
  HStack,
  Image,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Text,
} from '@chakra-ui/react'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { enableShapeShiftSnap } from 'utils/snaps'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { useModal } from 'hooks/useModal/useModal'
import { useToggle } from 'hooks/useToggle/useToggle'
import { isSome } from 'lib/utils'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

export const Snaps = () => {
  const { close, isOpen } = useModal('snaps')
  const isSnapsEnabled = useFeatureFlag('Snaps')

  const translate = useTranslate()
  const [shouldAskAgain, toggleShouldAskAgain] = useToggle(true)

  const handleDismiss = useCallback(
    (_shouldAskAgain: boolean) => {
      store.dispatch(preferences.actions.setShowSnapssModal(_shouldAskAgain))
      close()
    },
    [close],
  )

  const allNativeAssets = useMemo(() => {
    return Object.values(KnownChainIds)
      .map(knownChainId => {
        const assetId = getChainAdapterManager().get(knownChainId)?.getFeeAssetId()!
        const asset = selectAssetById(store.getState(), assetId)
        return asset
      })
      .filter(isSome)
  }, [])

  const handleAddSnap = useCallback(() => {
    enableShapeShiftSnap()
    handleDismiss(false)
  }, [handleDismiss])

  if (!isSnapsEnabled) return null

  return (
    <Modal isOpen={isOpen} onClose={() => handleDismiss(shouldAskAgain)} isCentered size='sm'>
      <ModalOverlay />
      <ModalContent minW='500px'>
        <ModalCloseButton />
        <ModalBody>
          <Box mx='auto' p='5' borderRadius='md' boxShadow='md'>
            <Heading mt='4'>{translate('walletProvider.metaMaskSnap.title')}</Heading>

            <Text mt='2'>{translate('walletProvider.metaMaskSnap.subtitle')}</Text>

            <HStack spacing={4} justify='center' mt='4' wrap='wrap'>
              {allNativeAssets.map(asset => (
                <Image src={asset.icon} alt='Icon 1' boxSize='30px' />
              ))}
            </HStack>

            <HStack mt='5' justify='space-between'>
              <Checkbox onChange={toggleShouldAskAgain}>Don't ask again</Checkbox>

              <HStack spacing={2}>
                <Button variant='ghost' onClick={() => handleDismiss(shouldAskAgain)}>
                  {translate('common.close')}
                </Button>
                <Button colorScheme='blue' onClick={handleAddSnap}>
                  {translate('walletProvider.metaMaskSnap.addSnap')}
                </Button>
              </HStack>
            </HStack>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
