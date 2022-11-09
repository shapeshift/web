import { CopyIcon, ExternalLinkIcon } from '@chakra-ui/icons'
import { Box, Divider, Flex, HStack, IconButton, Link, useColorModeValue } from '@chakra-ui/react'
import type { ParamType } from '@ethersproject/abi'
import { CHAIN_NAMESPACE } from '@shapeshiftoss/caip'
import type { WalletConnectEthSendTransactionCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge'
import startCase from 'lodash/startCase'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import type { FC } from 'react'
import { Fragment, useMemo } from 'react'
import { FaCode } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useGetContractAbiQuery } from 'state/apis/abi/abiApi'
import { handleAbiApiResponse } from 'state/apis/abi/utils'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ModalSection } from './ModalSection'

type Props = {
  request: WalletConnectEthSendTransactionCallRequest['params'][number]
}

export const ContractInteractionBreakdown: FC<Props> = ({ request }) => {
  const translate = useTranslate()
  const walletConnect = useWalletConnect()

  const query = useGetContractAbiQuery(request.to)
  const { contract } = handleAbiApiResponse(query)
  const transaction = useMemo(
    () => contract?.parseTransaction({ data: request.data, value: request.value }),
    [contract, request.data, request.value],
  )
  const connectedChainId = walletConnect.bridge?.connector.chainId
  const evmChainId = request.chainId ?? connectedChainId
  const assets = useAppSelector(selectAssets)
  const feeAsset = useMemo(() => {
    const chainId = `${CHAIN_NAMESPACE.Evm}:${evmChainId}`
    const feeAssetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
    if (!feeAssetId) return null
    const feeAsset = assets[feeAssetId]
    if (!feeAsset) return null
    return feeAsset
  }, [assets, evmChainId])

  const addressColor = useColorModeValue('blue.500', 'blue.200')

  const renderAbiInput = (input: ParamType, index: number) => {
    const inputValue = transaction!.args[index].toString()
    switch (input.type) {
      case 'bytes[]':
        return (
          <HStack>
            <MiddleEllipsis fontWeight='medium' value={inputValue} fontSize='md' />
            <IconButton
              size='small'
              variant='ghost'
              aria-label='Copy'
              icon={<CopyIcon />}
              onClick={() => navigator.clipboard.writeText(inputValue)}
            />
          </HStack>
        )
      case 'address':
        return (
          <HStack>
            <Box flex={1} fontFamily='monospace' fontSize='md'>
              <MiddleEllipsis color={addressColor} value={inputValue} />
            </Box>
            <IconButton
              size='small'
              variant='ghost'
              aria-label='Copy'
              icon={<CopyIcon />}
              onClick={() => navigator.clipboard.writeText(inputValue)}
            />
            <Link href={`https://etherscan.com/address/${inputValue}`} isExternal>
              <IconButton
                icon={<ExternalLinkIcon />}
                variant='ghost'
                size='small'
                aria-label={inputValue}
                p={2}
                colorScheme='gray'
              />
            </Link>
          </HStack>
        )
      default:
        return (
          <RawText fontWeight='normal' fontSize='md'>
            {inputValue}
          </RawText>
        )
    }
  }
  return (
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
        <Text
          color='gray.500'
          fontWeight='medium'
          translation='plugins.walletConnectToDapps.modal.sendTransaction.contractInteraction.amount'
          fontSize='sm'
        />
        <RawText fontWeight='medium' fontSize='md'>
          {feeAsset && (
            <Amount.Crypto
              value={bnOrZero(request.value).div(`1e+${feeAsset.precision}`).toString()}
              symbol={feeAsset.symbol}
            />
          )}
        </RawText>
        <Divider my={4} />
        {!!transaction &&
          transaction.functionFragment.inputs.map((input, index) => (
            <Fragment key={index}>
              <RawText color='gray.500' fontWeight='medium' fontSize='sm'>
                {startCase(input.name)} ({input.type})
              </RawText>
              {renderAbiInput(input, index)}
              <Divider my={4} />
            </Fragment>
          ))}

        <Flex justifyContent='space-between'>
          <Box>
            <Text
              color='gray.500'
              fontWeight='medium'
              fontSize='sm'
              translation='plugins.walletConnectToDapps.modal.sendTransaction.contractInteraction.data'
            />
          </Box>
          <Flex>
            <RawText pr={2}>{new TextEncoder().encode(request.data).length} bytes</RawText>
            <IconButton
              size='small'
              variant='ghost'
              aria-label='Copy'
              icon={<CopyIcon />}
              onClick={() => navigator.clipboard.writeText(request.data)}
            />
          </Flex>
        </Flex>
      </Box>
    </ModalSection>
  )
}
