import {
  Box,
  Button,
  Divider,
  Flex,
  Icon,
  Stack,
  Text as CText,
  useColorModeValue,
} from '@chakra-ui/react'
import { useCallback } from 'react'
import { FaArrowRight } from 'react-icons/fa'
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
    <Stack h='full'>
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

        <Button colorScheme='blue' px={4} onClick={handleCreateClick}>
          {translate('walletProvider.shapeShift.onboarding.createNewWallet')}
        </Button>

        <Button variant='link' color={bodyColor} mt={4} onClick={handleImportClick}>
          {translate('walletProvider.shapeShift.onboarding.importExisting')}
        </Button>
      </Flex>
      <Box width='100%' mb={4} textAlign='center' position='absolute' left={0} bottom={0}>
        <Divider my={6} />
        <CText color={bodyColor}>
          {translate('walletProvider.shapeShift.onboarding.comingFromThorswap')}{' '}
          <Button
            variant='link'
            color='blue.500'
            onClick={handleImportKeystoreClick}
            fontWeight='medium'
            colorScheme='blue'
          >
            {translate('walletProvider.shapeShift.onboarding.importFromKeystore')}
            <Icon as={FaArrowRight} ml={2} />
          </Button>
        </CText>
      </Box>
    </Stack>
  )
}
