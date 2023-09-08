import { Box, Divider, Flex, HStack, useColorModeValue } from '@chakra-ui/react'
import type { ParamType, TransactionDescription } from '@ethersproject/abi'
import startCase from 'lodash/startCase'
import { CopyButton } from 'plugins/walletConnectToDapps/components/modals/CopyButton'
import { ExternalLinkButton } from 'plugins/walletConnectToDapps/components/modals/ExternalLinkButtons'
import { ModalCollapsableSection } from 'plugins/walletConnectToDapps/components/modals/ModalCollapsableSection'
import { useGetAbi } from 'plugins/walletConnectToDapps/hooks/useGetAbi'
import type { WalletConnectEthSendTransactionCallRequest } from 'plugins/walletConnectToDapps/v1/bridge/types'
import { useWalletConnect } from 'plugins/walletConnectToDapps/v1/WalletConnectBridgeContext'
import type { FC } from 'react'
import { Fragment, useMemo } from 'react'
import { FaCode } from 'react-icons/fa'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import type { Asset } from 'lib/asset-service'
import { bnOrZero } from 'lib/bignumber/bignumber'

type ContractInteractionBreakdownProps = {
  request: WalletConnectEthSendTransactionCallRequest['params'][number]
  feeAsset: Asset | null
}

const EncodedText = ({ value }: { value: string }) => (
  <Flex alignItems='center'>
    <RawText pr={2}>{new TextEncoder().encode(value).length} bytes</RawText>
    <CopyButton value={value} />
  </Flex>
)

export const ContractInteractionBreakdown: FC<ContractInteractionBreakdownProps> = ({
  request,
  feeAsset,
}) => {
  const contractInterface = useGetAbi(request)

  const transaction: TransactionDescription | undefined = useMemo(() => {
    if (!contractInterface) return undefined
    try {
      return contractInterface?.parseTransaction({ data: request.data, value: request.value })
    } catch (e) {
      console.error(e)
      return undefined
    }
  }, [contractInterface, request.data, request.value])

  const addressColor = useColorModeValue('blue.500', 'blue.200')
  const { accountExplorerAddressLink } = useWalletConnect()

  const renderAbiInput = (input: ParamType, index: number): JSX.Element => {
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
      case 'tuple':
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
          transaction.functionFragment.inputs.map((input, index) => {
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
