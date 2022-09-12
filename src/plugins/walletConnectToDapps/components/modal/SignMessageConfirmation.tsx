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
  VStack
} from '@chakra-ui/react'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { Card } from 'components/Card/Card'
import { GasInput } from 'components/DeFi/components/GasInput'
import { RawText, Text } from 'components/Text'
import { FC, useState } from 'react'
import { useTranslate } from 'react-polyglot'

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
  const [gasInputValue, setGasInputValue] = useState<FeeDataKey>();
  return (
    <VStack p={6} spacing={6} alignItems='stretch'>
      <GasInput value={gasInputValue} onChange={setGasInputValue} />

      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.signMessage.signingFrom'
          mb={4}
        />
        <Card bg={useColorModeValue('white', 'gray.850')} p={4} borderRadius='md'>
          Wallet summary...
        </Card>
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
            <RawText fontWeight='medium' color='gray'>
              {message}
            </RawText>
          </Box>
        </Card>
      </Box>

      <Text
        fontWeight='medium'
        color='gray'
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
