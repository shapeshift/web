import { Box, Divider, Flex, HStack, useColorModeValue } from '@chakra-ui/react'
import type { ParamType, TransactionDescription } from '@ethersproject/abi'
import startCase from 'lodash/startCase'
import type { WalletConnectEthSendTransactionCallRequest } from 'plugins/walletConnectToDapps/bridge/types'
import { useGetAbi } from 'plugins/walletConnectToDapps/components/modal/callRequest/methods/hooks/useGetAbi'
import { useWalletConnect } from 'plugins/walletConnectToDapps/WalletConnectBridgeContext'
import type { FC } from 'react'
import { Fragment, useMemo } from 'react'
import { FaCode } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { logger } from 'lib/logger'

import { useCallRequestFees } from '../hooks/useCallRequestFees'
import { CopyButton } from './CopyButton'
import { ExternalLinkButton } from './ExternalLinkButtons'
import { ModalCollapsableSection } from './ModalCollapsableSection'

const moduleLogger = logger.child({ namespace: 'ContractInteractionBreakdown' })

type ContractInteractionBreakdownProps = {
  request: WalletConnectEthSendTransactionCallRequest['params'][number]
}

const EncodedText = ({ value }: { value: string }) => (
  <Flex alignItems='center'>
    <RawText pr={2}>{new TextEncoder().encode(value).length} bytes</RawText>
    <CopyButton value={value} />
  </Flex>
)

export const ContractInteractionBreakdown: FC<ContractInteractionBreakdownProps> = ({
  request,
}) => {
  // TODO(Q): this shouldn't be feeAsset, get the real asset from request
  const { feeAsset } = useCallRequestFees(request)
  const contractInterface = useGetAbi(request)

  const transaction: TransactionDescription | undefined = useMemo(() => {
    if (!contractInterface) return undefined
    try {
      return contractInterface?.parseTransaction({ data: request.data, value: request.value })
    } catch (e) {
      moduleLogger.error(e, 'parseTransaction')
      return undefined
    }
  }, [contractInterface, request.data, request.value])

  const addressColor = useColorModeValue('blue.500', 'blue.200')
  const { accountExplorerAddressLink } = useWalletConnect()

  const renderAbiInput = (input: ParamType, index: number) => {
    const inputValue = transaction?.args[index].toString()
    switch (input.type) {
      case 'bytes[]':
        return <EncodedText value={inputValue} />
      case 'address':
        return (
          <HStack>
            <Box flex={1} fontFamily='monospace' fontSize='md'>
              <MiddleEllipsis color={addressColor} value={inputValue} />
            </Box>
            <CopyButton value={inputValue} />
            <ExternalLinkButton
              href={`${accountExplorerAddressLink}${inputValue}`}
              ariaLabel={inputValue}
            />
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

  if (!accountExplorerAddressLink) return null

  return (
    <ModalCollapsableSection
      title={
        <Box lineHeight={2.4} m={0}>
          {transaction?.name}
        </Box>
      }
      icon={<FaCode />}
    >
      <Box pl={6} pt={2}>
        {request.value && (
          <>
            <Text
              color='gray.500'
              fontWeight='medium'
              translation='plugins.walletConnectToDapps.modal.sendTransaction.amount'
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
          </>
        )}
        {!!transaction &&
          transaction.functionFragment.inputs.map((input, index) => {
            const Wrapper = input.type === 'bytes[]' ? Flex : Fragment
            const wrapperProps =
              input.type === 'bytes[]'
                ? { justifyContent: 'space-between', alignItems: 'center' }
                : {}
            return (
              <Fragment key={index}>
                <Wrapper {...wrapperProps}>
                  <RawText color='gray.500' fontWeight='medium' fontSize='sm'>
                    {startCase(input.name)} ({input.type})
                  </RawText>
                  {renderAbiInput(input, index)}
                </Wrapper>
                <Divider my={4} />
              </Fragment>
            )
          })}

        <Flex justifyContent='space-between' alignItems='center'>
          <Box>
            <Text
              color='gray.500'
              fontWeight='medium'
              fontSize='sm'
              translation='plugins.walletConnectToDapps.modal.sendTransaction.contractInteraction.data'
            />
          </Box>
          <EncodedText value={request.data} />
        </Flex>
      </Box>
    </ModalCollapsableSection>
  )
}
