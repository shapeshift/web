import { Box, Button, Flex, Text as CText, useColorModeValue } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router-dom'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { Text } from 'components/Text'
import { NativeWalletRoutes } from 'context/WalletProvider/types'

export const NativeStart = () => {
  const translate = useTranslate()
  const history = useHistory()

  const headingColor = useColorModeValue('gray.800', 'whiteAlpha.800')
  const bodyColor = useColorModeValue('gray.600', 'whiteAlpha.600')
  const keystoreBgColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const mainTextColor = useColorModeValue('gray.700', 'whiteAlpha.800')

  const handleCreateClick = useCallback(() => history.push(NativeWalletRoutes.Create), [history])
  const handleImportClick = useCallback(
    () => history.push(NativeWalletRoutes.ImportSelect),
    [history],
  )
  const handleImportKeystoreClick = useCallback(
    () => history.push(NativeWalletRoutes.ImportKeystore),
    [history],
  )

  return (
    <Flex
      direction='column'
      alignItems='center'
      justifyContent='center'
      h='full'
      maxW='md'
      mx='auto'
      px={4}
      textAlign='center'
    >
      <Box mb={6}>
        <FoxIcon boxSize='16' />
      </Box>

      <Text
        fontSize='2xl'
        fontWeight='bold'
        mb={4}
        color={headingColor}
        translation='walletProvider.shapeShift.onboarding.whatIsShapeshiftWallet'
      />

      <Text
        color={mainTextColor}
        mb={8}
        translation='walletProvider.shapeShift.onboarding.yourDecentralizedGateway'
      />
      <Text
        color={mainTextColor}
        mb={12}
        translation='walletProvider.shapeShift.onboarding.crossChainFreedom'
      />

      <Box bg={keystoreBgColor} rounded='md' width='100%' py={2} mb={4} textAlign='center'>
        <CText color={bodyColor}>
          {translate('walletProvider.shapeShift.onboarding.haveAKeystore')}{' '}
          <Button variant='link' color='blue.500' onClick={handleImportKeystoreClick}>
            {translate('walletProvider.shapeShift.onboarding.importFromKeystore')}
          </Button>
        </CText>
      </Box>

      <Button colorScheme='blue' px={4} onClick={handleCreateClick}>
        {translate('walletProvider.shapeShift.onboarding.createANewWallet')}
      </Button>

      <Button variant='link' color={bodyColor} mt={4} onClick={handleImportClick}>
        {translate('walletProvider.shapeShift.onboarding.importExisting')}
      </Button>
    </Flex>
  )
}
