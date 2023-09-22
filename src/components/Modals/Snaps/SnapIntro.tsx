import { WarningTwoIcon } from '@chakra-ui/icons'
import {
  Button,
  Center,
  Checkbox,
  Flex,
  Heading,
  HStack,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Text,
} from '@chakra-ui/react'
import { KnownChainIds } from '@shapeshiftoss/types'
import { useCallback, useMemo } from 'react'
import { FaArrowRightArrowLeft } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { MetaMaskIcon } from 'components/Icons/MetaMaskIcon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvents } from 'lib/mixpanel/types'
import { isSome } from 'lib/utils'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

export const SnapIntro = ({ isRemoved }: { isRemoved?: boolean }) => {
  const translate = useTranslate()
  const history = useHistory()

  const titleSlug = isRemoved
    ? 'walletProvider.metaMaskSnap.uninstall.title'
    : 'walletProvider.metaMaskSnap.title'

  const bodySlug = isRemoved
    ? 'walletProvider.metaMaskSnap.uninstall.subtitle'
    : 'walletProvider.metaMaskSnap.subtitle'

  const allNativeAssets = useMemo(() => {
    return Object.values(KnownChainIds)
      .map(knownChainId => {
        const assetId = getChainAdapterManager().get(knownChainId)?.getFeeAssetId()!
        const asset = selectAssetById(store.getState(), assetId)
        return asset
      })
      .filter(isSome)
  }, [])

  const handleCheckboxChange = useCallback((value: boolean) => {
    store.dispatch(preferences.actions.setShowSnapssModal(value))
  }, [])

  const renderChains = useMemo(() => {
    return (
      <HStack px={6} spacing={4} justify='center' mt='4' wrap='wrap'>
        {allNativeAssets.map(asset => (
          <AssetIcon key={asset.assetId} src={asset.networkIcon ?? asset.icon} size='sm' />
        ))}
      </HStack>
    )
  }, [allNativeAssets])

  const handleNext = useCallback(() => {
    getMixPanel()?.track(MixPanelEvents.StartAddSnap)
    history.push('/confirm')
  }, [history])

  return (
    <>
      <ModalHeader textAlign='center'>
        <Flex alignItems='center' justifyContent='center' py={4} gap={4} mx={12}>
          <Center
            bg='background.surface.raised.base'
            borderWidth={1}
            borderColor='border.base'
            boxSize='64px'
            borderRadius='xl'
          >
            <MetaMaskIcon boxSize='48px' />
          </Center>
          {isRemoved ? (
            <WarningTwoIcon color='text.warning' />
          ) : (
            <FaArrowRightArrowLeft color='text.base' />
          )}
          <Center
            bg='background.surface.raised.base'
            borderWidth={1}
            borderColor='border.base'
            boxSize='64px'
            borderRadius='xl'
          >
            <FoxIcon boxSize='40px' />
          </Center>
        </Flex>
        <Heading as='h3' lineHeight='shorter'>
          {translate(titleSlug)}
        </Heading>
      </ModalHeader>
      <ModalBody textAlign='center'>
        <Text>{translate(bodySlug)}</Text>

        <HStack px={6} spacing={4} justify='center' mt='4' wrap='wrap'>
          {renderChains}
        </HStack>
      </ModalBody>
      <ModalFooter justifyContent='space-between' mt={4}>
        <Checkbox onChange={e => handleCheckboxChange(e.target.checked)}>Don't ask again</Checkbox>
        <HStack spacing={2}>
          <Button colorScheme='blue' onClick={handleNext}>
            {translate('walletProvider.metaMaskSnap.addSnap')}
          </Button>
        </HStack>
      </ModalFooter>
    </>
  )
}
