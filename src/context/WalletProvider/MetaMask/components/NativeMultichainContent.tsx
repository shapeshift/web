import { WarningIcon } from '@chakra-ui/icons'
import { Button, Center, Flex, Heading, HStack, Tag, Text, VStack } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { useTranslate } from 'react-polyglot'

import { AssetIcon } from '@/components/AssetIcon'
import { MetaMaskIcon } from '@/components/Icons/MetaMaskIcon'

type NativeMultichainContentProps = {
  hasSnap: boolean | null
  chainAssets: Asset[]
  onUseNative: () => void
  onKeepSnap: () => void
  isKeepSnapLoading: boolean
}

export const NativeMultichainContent: React.FC<NativeMultichainContentProps> = ({
  hasSnap,
  chainAssets,
  onUseNative,
  onKeepSnap,
  isKeepSnapLoading,
}) => {
  const translate = useTranslate()

  const chainNames = chainAssets.map(a => a.name).join(' and ')

  return (
    <>
      <Flex direction='column' alignItems='center' px={6} pt={8} pb={hasSnap ? 4 : 6}>
        <Center
          bg='background.surface.raised.base'
          borderWidth={1}
          borderColor='border.base'
          boxSize='80px'
          borderRadius='xl'
          mb={6}
        >
          <MetaMaskIcon boxSize='56px' />
        </Center>
        <Heading as='h3' fontSize='xl' textAlign='center' lineHeight='shorter' mb={2}>
          {translate('walletProvider.nativeMultichain.title', { chains: chainNames })}
        </Heading>
        <Text color='text.subtle' textAlign='center' mb={4}>
          {translate('walletProvider.nativeMultichain.subtitle', { chains: chainNames })}
        </Text>
        <HStack spacing={3} mb={6}>
          {chainAssets.map(asset => (
            <AssetIcon key={asset.assetId} src={asset.networkIcon ?? asset.icon} size='sm' />
          ))}
        </HStack>
        <VStack spacing={3} width='full'>
          <Button width='full' colorScheme='blue' size='lg' onClick={onUseNative}>
            <HStack spacing={2}>
              <Text>{translate('walletProvider.nativeMultichain.useNative')}</Text>
              {hasSnap && (
                <Tag size='sm' colorScheme='green' variant='solid'>
                  {translate('walletProvider.nativeMultichain.useNativeRecommended')}
                </Tag>
              )}
            </HStack>
          </Button>
          {hasSnap && (
            <Button
              width='full'
              variant='ghost'
              size='lg'
              onClick={onKeepSnap}
              isLoading={isKeepSnapLoading}
            >
              {translate('walletProvider.nativeMultichain.keepSnap')}
            </Button>
          )}
        </VStack>
      </Flex>
      {hasSnap && (
        <HStack spacing={2} justifyContent='center' pb={6} px={6}>
          <WarningIcon boxSize={3} color='text.warning' />
          <Text fontSize='xs' color='text.subtle'>
            {translate('walletProvider.nativeMultichain.snapChainWarning')}
          </Text>
        </HStack>
      )}
    </>
  )
}
