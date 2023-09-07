import {
  Button,
  Checkbox,
  Heading,
  HStack,
  Image,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Text,
} from '@chakra-ui/react'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { enableShapeShiftSnap } from 'utils/snaps'
import { CircularProgress } from 'components/CircularProgress/CircularProgress'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { useFeatureFlag } from 'hooks/useFeatureFlag/useFeatureFlag'
import { isSome } from 'lib/utils'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

export const SnapContent = () => {
  const isSnapsEnabled = useFeatureFlag('Snaps')
  const [isInstalling, setIsInstalling] = useState(false)

  const translate = useTranslate()

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
    setIsInstalling(true)
    enableShapeShiftSnap()
  }, [])

  const handleCheckboxChange = useCallback((value: boolean) => {
    store.dispatch(preferences.actions.setShowSnapssModal(value))
  }, [])

  if (!isSnapsEnabled) return null

  if (isInstalling) {
    return (
      <ModalBody
        display='flex'
        flexDir='column'
        gap={4}
        alignItems='center'
        justifyContent='center'
      >
        <CircularProgress />
        <Button variant='ghost' onClick={() => setIsInstalling(false)}>
          {translate('common.cancel')}
        </Button>
      </ModalBody>
    )
  }

  return (
    <>
      <ModalHeader textAlign='center'>
        <Heading as='h3'>{translate('walletProvider.metaMaskSnap.title')}</Heading>
      </ModalHeader>
      <ModalBody textAlign='center'>
        <Text>{translate('walletProvider.metaMaskSnap.subtitle')}</Text>

        <HStack px={6} spacing={4} justify='center' mt='4' wrap='wrap'>
          {allNativeAssets.map(asset => (
            <Image src={asset.icon} alt='Icon 1' boxSize='30px' />
          ))}
        </HStack>
      </ModalBody>
      <ModalFooter justifyContent='space-between' mt={4}>
        <Checkbox onChange={e => handleCheckboxChange(e.target.checked)}>Don't ask again</Checkbox>
        <HStack spacing={2}>
          <Button colorScheme='blue' onClick={handleAddSnap}>
            {translate('walletProvider.metaMaskSnap.addSnap')}
          </Button>
        </HStack>
      </ModalFooter>
    </>
  )
}
