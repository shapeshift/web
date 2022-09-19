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
import type { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import type { FC } from 'react'
import { useState } from 'react'
import { FaWrench } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { GasInput } from 'components/DeFi/components/GasInput'
import { RawText, Text } from 'components/Text'

import { ModalSection } from './ModalSection'
import { SignTransactionAdvancedParameters } from './SignTransactionAdvancedParameters'
import { WalletSummaryCard } from './WalletSummaryCard'

type Props = {
  message: string
  dapp: {
    image: string
    name: string
    url: string
  }
  isLoading: boolean
}

export const SignMessageConfirmation: FC<Props> = ({ message, dapp, isLoading }) => {
  const translate = useTranslate()
  const [gasInputValue, setGasInputValue] = useState<FeeDataKey>()
  return (
    <VStack p={6} spacing={6} alignItems='stretch'>
      <GasInput value={gasInputValue} onChange={setGasInputValue} />
      <ModalSection
        title={translate(
          'plugins.walletConnectToDapps.modal.signTransaction.advancedParameters.title',
        )}
        icon={<FaWrench />}
      >
        <SignTransactionAdvancedParameters />
      </ModalSection>

      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.signMessage.signingFrom'
          mb={4}
        />
        <WalletSummaryCard
          address='0x03ed759b696b62774D02156a189F6E176C15b3a3'
          name='My Wallet'
          url='https://etherscan.com/address/0x03ed759b696b62774D02156a189F6E176C15b3a3'
          balance={10}
        />
      </Box>

      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.signMessage.requestFrom'
          mb={4}
        />
        <Card bg={useColorModeValue('white', 'gray.850')} borderRadius='md'>
          <HStack align='center' pl={4}>
            <Image borderRadius='full' boxSize='24px' src={dapp.image} />
            <RawText fontWeight='semibold' flex={1}>
              {dapp.name}
            </RawText>
            <Link href={dapp.url} isExternal>
              <IconButton
                icon={<ExternalLinkIcon />}
                variant='ghost'
                aria-label={dapp.name}
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
        >
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
        <Button size='lg' width='full' isLoading={isLoading} disabled={isLoading}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </VStack>
  )
}
