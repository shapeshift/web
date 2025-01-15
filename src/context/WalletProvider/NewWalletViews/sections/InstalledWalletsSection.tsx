import { Box, Button, Flex, Image, Stack, Text as CText } from '@chakra-ui/react'
import { uniqBy } from 'lodash'
import { useMemo } from 'react'
import { isMobile } from 'react-device-detect'
import { Text } from 'components/Text'
import type { KeyManager } from 'context/WalletProvider/KeyManager'
import { useWallet } from 'hooks/useWallet/useWallet'
import { isMobile as isMobileApp } from 'lib/globals'
import { staticMipdProviders, useMipdProviders } from 'lib/mipd'

export const InstalledWalletsSection = ({
  selectedWallet,
  onSelectWallet,
}: {
  selectedWallet: string | null
  onSelectWallet: (rdns: string) => void
}) => {
  const { connect } = useWallet()
  const detectedMipdProviders = useMipdProviders()

  const supportedStaticProviders = useMemo(() => {
    if (isMobileApp || isMobile) return []
    return staticMipdProviders
  }, [])

  const mipdProviders = useMemo(
    () => uniqBy(detectedMipdProviders.concat(supportedStaticProviders), 'info.rdns'),
    [detectedMipdProviders, supportedStaticProviders],
  )

  const filteredProviders = useMemo(
    () =>
      mipdProviders.filter(
        provider =>
          provider.info.rdns !== 'app.keplr' &&
          provider.info.rdns !== 'app.phantom' &&
          provider.info.rdns !== 'com.coinbase.wallet',
      ),
    [mipdProviders],
  )

  return (
    <Stack spacing={2} my={6}>
      <Text fontSize='sm' fontWeight='medium' color='gray.500' translation='Installed' />
      {filteredProviders.map(provider => {
        const isSelected = selectedWallet === provider.info.rdns

        const handleClick = () => {
          onSelectWallet(provider.info.rdns)
          // TODO(gomes): this may or may not be necessary. We will try to leverag existing routing from WalletProvider, but if this gets too hairy, local state may be enough and actually
          // allow to clean things up?
          connect(provider.info.rdns as KeyManager, true)
        }

        return (
          <Box
            as={Button}
            key={provider.info.rdns}
            variant='ghost'
            px={2}
            ml={-2}
            py={6}
            borderRadius='md'
            width='full'
            onClick={handleClick}
            bg={isSelected ? 'whiteAlpha.100' : undefined}
          >
            <Flex alignItems='center' width='full'>
              <Image src={provider.info.icon} boxSize='24px' mr={3} />
              <CText>{provider.info.name}</CText>
            </Flex>
          </Box>
        )
      })}
    </Stack>
  )
}
