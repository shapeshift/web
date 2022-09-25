import { CopyIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  HStack,
  IconButton,
  Image,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import type { WalletConnectEthSendTransactionCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge/dist/types'
import { CurrencyAmount } from '@uniswap/sdk'
import _ from 'lodash'
import { useContract } from 'plugins/walletConnectToDapps/ContractABIContext'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import type { FC } from 'react'
import { Fragment, useMemo } from 'react'
import { FaCode, FaGasPump, FaWrench } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Card } from 'components/Card/Card'
import { FoxIcon } from 'components/Icons/FoxIcon'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'

import { AddressSummaryCard } from './AddressSummaryCard'
import { ModalSection } from './ModalSection'
import { TransactionAdvancedParameters } from './TransactionAdvancedParameters'

type Props = {
  request: WalletConnectEthSendTransactionCallRequest['params'][number]
  onConfirm(): void
  onReject(): void
}

export const SendTransactionConfirmation: FC<Props> = ({ request, onConfirm, onReject }) => {
  const translate = useTranslate()
  const cardBg = useColorModeValue('white', 'gray.850')

  const { contract } = useContract(request.to, request.chainId)
  const transaction = useMemo(
    () => contract?.parseTransaction({ data: request.data, value: request.value }),
    [contract, request.data, request.value],
  )

  const walletConnect = useWalletConnect()
  if (!walletConnect.bridge || !walletConnect.dapp) return null
  const address = walletConnect.bridge?.connector.accounts[0]

  // const [gasInputValue, setGasInputValue] = useState<FeeDataKey>()
  return (
    <VStack p={6} spacing={6} alignItems='stretch'>
      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.sendTransaction.sendingFrom'
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
          translation='plugins.walletConnectToDapps.modal.sendTransaction.interactingWith'
          mb={4}
        />
        <AddressSummaryCard
          address={request.to}
          icon={
            <Image
              borderRadius='full'
              w='full'
              h='full'
              src='https://assets.coincap.io/assets/icons/256/eth.png'
            />
          }
        />
      </Box>

      <Box>
        <Text
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.sendTransaction.contractInteraction.title'
          mb={4}
        />
        <Card bg={cardBg} borderRadius='md' px={4} py={2}>
          <ModalSection
            title={
              transaction?.name ??
              translate(
                'plugins.walletConnectToDapps.modal.sendTransaction.contractInteraction.sendingEth',
              )
            }
            icon={<FaCode />}
          >
            <Box pl={6} pt={2}>
              {!!transaction ? (
                transaction.functionFragment.inputs.map((input, index) => (
                  <Fragment key={index}>
                    <RawText color='gray.500' fontWeight='medium'>
                      {_.startCase(input.name)} ({input.type})
                    </RawText>
                    {input.type === 'bytes[]' ? (
                      <MiddleEllipsis
                        fontWeight='medium'
                        value={transaction.args[index].toString()}
                      />
                    ) : (
                      <RawText fontWeight='normal'>{transaction.args[index].toString()}</RawText>
                    )}
                    <Divider my={4} />
                  </Fragment>
                ))
              ) : (
                <>
                  <Text
                    color='gray.500'
                    fontWeight='medium'
                    translation='plugins.walletConnectToDapps.modal.sendTransaction.contractInteraction.amount'
                  />
                  <RawText fontWeight='medium'>
                    {/* TODO: what's the best way to format e.g. an ether amount with the appropriate amount of decimals? */}
                    {CurrencyAmount.ether(request.value).toFixed()}
                  </RawText>
                  <Divider my={4} />
                </>
              )}

              <Text
                color='gray.500'
                fontWeight='medium'
                translation='plugins.walletConnectToDapps.modal.sendTransaction.contractInteraction.data'
              />
              <HStack>
                <MiddleEllipsis value={request.data} fontWeight='medium' />
                <IconButton
                  size='small'
                  variant='ghost'
                  aria-label='Copy'
                  icon={<CopyIcon />}
                  onClick={() => navigator.clipboard.writeText(request.data)}
                />
              </HStack>
            </Box>
          </ModalSection>
        </Card>
      </Box>

      <ModalSection
        title={translate('plugins.walletConnectToDapps.modal.sendTransaction.estGasCost')}
        icon={<FaGasPump />}
        defaultOpen={false}
      >
        todo
      </ModalSection>

      <ModalSection
        title={translate(
          'plugins.walletConnectToDapps.modal.sendTransaction.advancedParameters.title',
        )}
        icon={<FaWrench />}
        defaultOpen={false}
      >
        <TransactionAdvancedParameters />
      </ModalSection>

      <Text
        fontWeight='medium'
        color='gray.500'
        translation='plugins.walletConnectToDapps.modal.sendTransaction.description'
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
