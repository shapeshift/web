import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  HStack,
  IconButton,
  Image,
  Link,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import type { FC } from 'react'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { RawText, Text } from 'components/Text'

import { WalletSummaryCard } from './WalletSummaryCard'

type Props = {
  message: string
  isLoading: boolean
  onConfirm(): void
  onReject(): void
}

export const SignMessageConfirmation: FC<Props> = ({ message, isLoading, onConfirm, onReject }) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.850')

  const walletConnect = useWalletConnect()
  if (!walletConnect.bridge || !walletConnect.dapp) return null
  const address = walletConnect.bridge?.connector.accounts[0]

  // const [gasInputValue, setGasInputValue] = useState<FeeDataKey>()
  return (
    <VStack p={6} spacing={6} alignItems='stretch'>
      {/* <GasInput value={gasInputValue} onChange={setGasInputValue} />
      <ModalSection
        title={translate(
          'plugins.walletConnectToDapps.modal.signTransaction.advancedParameters.title',
        )}
        icon={<FaWrench />}
      >
        <SignTransactionAdvancedParameters />
      </ModalSection> */}

      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.signMessage.signingFrom'
          mb={4}
        />
        <WalletSummaryCard
          address={address}
          name='My Wallet' // TODO: what string do we put here?
          url={`https://etherscan.com/address/${address}`}
        />
      </Box>

      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.signMessage.requestFrom'
          mb={4}
        />
        <Card bg={cardBg} borderRadius='md'>
          <HStack align='center' pl={4}>
            <Image borderRadius='full' boxSize='24px' src={walletConnect.dapp.icons[0]} />
            <RawText fontWeight='semibold' flex={1}>
              {walletConnect.dapp.name}
            </RawText>
            <Link href={walletConnect.dapp.url.replace(/^https?:\/\//, '')} isExternal>
              <IconButton
                icon={<ExternalLinkIcon />}
                variant='ghost'
                aria-label={walletConnect.dapp.name}
                colorScheme='gray'
              />
            </Link>
          </HStack>
          <Divider />
          <Box p={4}>
            <Text
              translation='plugins.walletConnectToDapps.modal.signMessage.message'
              fontWeight='medium'
              mb={1}
            />
            <RawText fontWeight='medium' color='gray.500'>
              {message}
            </RawText>
          </Box>
        </Card>
      </Box>

      <Text
        fontWeight='medium'
        color='gray.500'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />

      <VStack spacing={4}>
        <Button
          size='lg'
          width='full'
          colorScheme='blue'
          isLoading={isLoading}
          disabled={isLoading}
          type='submit'
          onClick={onConfirm}
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
        <Button
          size='lg'
          width='full'
          isLoading={isLoading}
          disabled={isLoading}
          onClick={onReject}
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </VStack>
  )
}
