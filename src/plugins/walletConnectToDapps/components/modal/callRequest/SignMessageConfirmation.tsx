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
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import { useMemo, useState } from 'react'
import { FaGasPump, FaWrench } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { Card } from 'components/Card/Card'
import { GasInput } from 'components/DeFi/components/GasInput'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { fromBaseUnit } from 'lib/math'
import { selectAssetById, selectMarketDataById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AddressSummaryCard } from './AddressSummaryCard'
import { ModalSection } from './ModalSection'
import { TransactionAdvancedParameters } from './TransactionAdvancedParameters'

type SignMessageConfirmationProps = {
  message: string
  onConfirm(): void
  onReject(): void
}
export type WalletConnectFeeDataKey = FeeDataKey | 'custom'

export const SignMessageConfirmation: React.FC<SignMessageConfirmationProps> = props => {
  const { message, onConfirm, onReject } = props
  const translate = useTranslate()
  const [gasInputValue, setGasInputValue] = useState<WalletConnectFeeDataKey>(FeeDataKey.Average)
  // walletconnect only supports eth mainnet
  const ethAsset = useAppSelector(s => selectAssetById(s, ethAssetId))
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
  const cardBg = useColorModeValue('white', 'gray.850')

  const walletConnect = useWalletConnect()
  if (!walletConnect.bridge || !walletConnect.dapp) return null
  const address = walletConnect.bridge?.connector.accounts[0]

  return (
    <VStack p={6} spacing={6} alignItems='stretch'>
      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.signMessage.signingFrom'
          mb={4}
        />
        <AddressSummaryCard
          address={address}
          name='My Wallet' // TODO: what string do we put here?
          icon={<FoxIcon color='gray.500' w='full' h='full' />}
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
          'plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.title',
        )}
        icon={<FaWrench />}
      >
        <TransactionAdvancedParameters />
      </ModalSection>
      <Text
        fontWeight='medium'
        color='gray.500'
        translation='plugins.walletConnectToDapps.modal.signMessage.description'
      />
      <VStack spacing={4}>
        <Button size='lg' width='full' colorScheme='blue' type='submit' onClick={onConfirm}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.confirm')}
        </Button>
        <Button size='lg' width='full' onClick={onReject}>
          {translate('plugins.walletConnectToDapps.modal.signMessage.reject')}
        </Button>
      </VStack>
    </VStack>
  )
}
