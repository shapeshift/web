import { ExternalLinkIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  IconButton,
  Image,
  Link,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { ethAssetId } from '@shapeshiftoss/caip'
import { FeeDataKey } from '@shapeshiftoss/chain-adapters'
import { useMemo, useState } from 'react'
import { FaGasPump, FaWrench } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { GasInput } from 'components/DeFi/components/GasInput'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ModalSection } from './ModalSection'
import { SignTransactionAdvancedParameters } from './SignTransactionAdvancedParameters'
import { WalletSummaryCard } from './WalletSummaryCard'

type SignMessageConfirmationProps = {
  message: string
  dapp: {
    image: string
    name: string
    url: string
  }
  isLoading: boolean
}

export type WalletConnectFeeDataKey = FeeDataKey | 'custom'

export const SignMessageConfirmation: React.FC<SignMessageConfirmationProps> = props => {
  const { message, dapp, isLoading } = props
  const translate = useTranslate()
  const [gasInputValue, setGasInputValue] = useState<WalletConnectFeeDataKey>(FeeDataKey.Average)
  // walletconnect only supports eth mainnet
  const ethAsset = useAppSelector(s => selectAssetById(s, ethAssetId))
  if (!ethAsset) throw new Error(`Asset not found for AssetId ${ethAssetId}`)

  const ethMarketData = useAppSelector(s => selectMarketDataById(s, ethAssetId))
  const titleRightComponent = useMemo(() => {
    return (
      <Flex gap={1}>
        <Amount.Fiat value={fromBaseUnit(gasInputValue, ethAsset.precision)} />
        <Amount.Crypto
          prefix='≈'
          color='gray.500'
          symbol={ethAsset.symbol}
          value={bnOrZero(fromBaseUnit(gasInputValue, ethAsset.precision))
            .times(bnOrZero(ethMarketData.price))
            .toString()}
        />
      </Flex>
    )
  }, [ethAsset, ethMarketData.price, gasInputValue])

  return (
    <VStack p={6} spacing={6} alignItems='stretch'>
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
      <ModalSection
        defaultOpen={false}
        title={translate('gasInput.estGasCost')}
        titleRightComponent={titleRightComponent}
        icon={<FaGasPump />}
      >
        <GasInput value={gasInputValue} onChange={setGasInputValue} />
      </ModalSection>
      <ModalSection
        defaultOpen={false}
        title={translate(
          'plugins.walletConnectToDapps.modal.signTransaction.advancedParameters.title',
        )}
        icon={<FaWrench />}
      >
        <SignTransactionAdvancedParameters />
      </ModalSection>
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
