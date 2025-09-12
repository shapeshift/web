import { Box, Divider, Flex, HStack, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import type { ParamType, TransactionDescription } from 'ethers'
import startCase from 'lodash/startCase'
import type { FC, JSX } from 'react'
import { Fragment, useCallback, useMemo } from 'react'
import { FaCode } from 'react-icons/fa'

import { Amount } from '@/components/Amount/Amount'
import { InlineCopyButton } from '@/components/InlineCopyButton'
import { MiddleEllipsis } from '@/components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from '@/components/Text'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { ExternalLinkButton } from '@/plugins/walletConnectToDapps/components/modals/ExternalLinkButtons'
import { ModalCollapsableSection } from '@/plugins/walletConnectToDapps/components/modals/ModalCollapsableSection'
import { useGetAbi } from '@/plugins/walletConnectToDapps/hooks/useGetAbi'
import type { EthSendTransactionCallRequest } from '@/plugins/walletConnectToDapps/types'

type ContractInteractionBreakdownProps = {
  request: EthSendTransactionCallRequest['params'][number]
  feeAsset: Asset | undefined
}

const EncodedText = ({ value }: { value: string }) => (
  <InlineCopyButton value={value}>
    <RawText pr={2}>{new TextEncoder().encode(value).length} bytes</RawText>
  </InlineCopyButton>
)

const faCodeIcon = <FaCode />

export const ContractInteractionBreakdown: FC<ContractInteractionBreakdownProps> = ({
  request,
  feeAsset,
}) => {
  const contractInterface = useGetAbi(request)

  const transaction: TransactionDescription | null = useMemo(() => {
    if (!contractInterface) return null
    try {
      return contractInterface?.parseTransaction({ data: request.data, value: request.value })
    } catch (e) {
      console.error(e)
      return null
    }
  }, [contractInterface, request.data, request.value])

  const addressColor = useColorModeValue('blue.500', 'blue.200')

  const renderAbiInput = useCallback(
    (input: ParamType, index: number): JSX.Element => {
      const inputValue = transaction?.args[index].toString()
      switch (input.type) {
        case 'bytes[]':
          return <EncodedText value={inputValue} />
        case 'address':
          return (
            <HStack>
              <InlineCopyButton value={inputValue}>
                <Box flex={1} fontFamily='monospace' fontSize='md'>
                  <MiddleEllipsis color={addressColor} value={inputValue} />
                </Box>
              </InlineCopyButton>
              {feeAsset && (
                <ExternalLinkButton
                  href={`${feeAsset.explorerAddressLink}${inputValue}`}
                  ariaLabel={inputValue}
                />
              )}
            </HStack>
          )
        case 'tuple':
        default:
          return (
            <RawText fontWeight='normal' fontSize='md'>
              {inputValue}
            </RawText>
          )
      }
    },
    [addressColor, feeAsset, transaction?.args],
  )

  const transactionNameTitle = useMemo(
    () => (
      <Box lineHeight={2.4} m={0}>
        {transaction?.name}
      </Box>
    ),
    [transaction?.name],
  )

  return (
    <ModalCollapsableSection title={transactionNameTitle} icon={faCodeIcon}>
      <Box pl={6} pt={2}>
        {request.value && (
          <>
            <Text
              color='text.subtle'
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
          transaction.fragment.inputs.map((input, index) => {
            const Wrapper = input.type === 'bytes[]' ? Flex : Fragment
            const wrapperProps =
              input.type === 'bytes[]'
                ? { justifyContent: 'space-between', alignItems: 'center' }
                : {}
            return (
              <Fragment key={index}>
                <Wrapper {...wrapperProps}>
                  <RawText color='text.subtle' fontWeight='medium' fontSize='sm'>
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
              color='text.subtle'
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
