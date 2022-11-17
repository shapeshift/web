import { Box, Divider, Flex, HStack, useColorModeValue } from '@chakra-ui/react'
import type { ParamType } from '@ethersproject/abi'
import type { WalletConnectEthSendTransactionCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge'
import startCase from 'lodash/startCase'
import type { FC } from 'react'
import { Fragment, useMemo } from 'react'
import { FaCode } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { useGetContractAbiQuery } from 'state/apis/abi/abiApi'
import { handleAbiApiResponse } from 'state/apis/abi/utils'

import { useCallRequestFees } from '../hooks/useCallRequestFees'
import { CopyButton } from './CopyButton'
import { ExternalLinkButton } from './ExternalLinkButtons'
import { ModalSection } from './ModalSection'

type Props = {
  request: WalletConnectEthSendTransactionCallRequest['params'][number]
}

const EncodedText = ({ value }: { value: string }) => (
  <Flex>
    <RawText pr={2}>{new TextEncoder().encode(value).length} bytes</RawText>
    <CopyButton value={value} />
  </Flex>
)

export const ContractInteractionBreakdown: FC<Props> = ({ request }) => {
  // TODO(Q): this shouldn't be feeAsset, get the real asset from request
  const { feeAsset } = useCallRequestFees(request)

  const query = useGetContractAbiQuery(request.to)
  const { contract } = handleAbiApiResponse(query)
  const transaction = useMemo(
    () => contract?.parseTransaction({ data: request.data, value: request.value }),
    [contract, request.data, request.value],
  )

  const addressColor = useColorModeValue('blue.500', 'blue.200')

  const renderAbiInput = (input: ParamType, index: number) => {
    const inputValue = transaction!.args[index].toString()
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
              href={`https://etherscan.com/address/${inputValue}`}
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
  return (
    <ModalSection
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
            const wrapperProps = input.type === 'bytes[]' ? { justifyContent: 'space-between' } : {}
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

        <Flex justifyContent='space-between'>
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
    </ModalSection>
  )
}
