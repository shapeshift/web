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
import { knownChainIds } from 'constants/chains'
import { useCallback, useMemo } from 'react'
import { FaArrowRightArrowLeft } from 'react-icons/fa6'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { AssetIcon } from 'components/AssetIcon'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { MetaMaskIcon } from 'components/Icons/MetaMaskIcon'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { getMixPanel } from 'lib/mixpanel/mixPanelSingleton'
import { MixPanelEvent } from 'lib/mixpanel/types'
import { isSome } from 'lib/utils'
import { preferences } from 'state/slices/preferencesSlice/preferencesSlice'
import { selectAssetById } from 'state/slices/selectors'
import { store } from 'state/store'

export const SnapIntro = ({
  isRemoved,
  isCorrectVersion,
}: {
  isRemoved?: boolean
  isCorrectVersion: boolean
}) => {
  const translate = useTranslate()
  const history = useHistory()

  const titleSlug = useMemo(() => {
    if (!isCorrectVersion) return 'walletProvider.metaMaskSnap.update.title'
    if (isRemoved) return 'walletProvider.metaMaskSnap.uninstall.title'
    return 'walletProvider.metaMaskSnap.title'
  }, [isCorrectVersion, isRemoved])

  const bodySlug = useMemo(() => {
    if (!isCorrectVersion) return 'walletProvider.metaMaskSnap.update.subtitle'
    if (isRemoved) return 'walletProvider.metaMaskSnap.uninstall.subtitle'
    return 'walletProvider.metaMaskSnap.subtitle'
  }, [isCorrectVersion, isRemoved])

  const allNativeAssets = useMemo(() => {
    return knownChainIds
      .map(knownChainId => {
        const assetId = getChainAdapterManager().get(knownChainId)?.getFeeAssetId()!
        const asset = selectAssetById(store.getState(), assetId)
        return asset
      })
      .filter(isSome)
  }, [])

  const handleCheckboxChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    store.dispatch(preferences.actions.setShowSnapsModal(!event.target.checked))
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
    getMixPanel()?.track(MixPanelEvent.StartAddSnap)
    history.push('/confirm')
  }, [history])

  const confirmCopy = useMemo(() => {
    if (isCorrectVersion) return translate('walletProvider.metaMaskSnap.addSnap')
    return translate('common.update')
  }, [isCorrectVersion, translate])

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
        <Checkbox onChange={handleCheckboxChange}>
          {translate('walletProvider.metaMaskSnap.dontAskAgain')}
        </Checkbox>
        <HStack spacing={2}>
          <Button colorScheme='blue' onClick={handleNext}>
            {confirmCopy}
          </Button>
        </HStack>
      </ModalFooter>
    </>
  )
}
