import { CopyIcon } from '@chakra-ui/icons'
import { Box, Divider, HStack, IconButton } from '@chakra-ui/react'
import { CurrencyAmount } from '@uniswap/sdk'
import type { WalletConnectEthSendTransactionCallRequest } from 'kkdesktop/walletconnect/types'
// import _ from 'lodash'
import { useContract } from 'plugins/walletConnectToDapps/ContractABIContext'
import type { FC } from 'react'
import { Fragment, useMemo } from 'react'
import { FaCode } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'

import { ModalSection } from './ModalSection'

type Props = {
  request: WalletConnectEthSendTransactionCallRequest['params'][number]
}

export const ContractInteractionBreakdown: FC<Props> = ({ request }) => {
  const translate = useTranslate()

  const { contract } = useContract(request.to, request.chainId)
  const transaction = useMemo(() => {
    try {
      return contract?.parseTransaction({ data: request.data, value: request.value })
    } catch (e) {
      return
    }
  }, [contract, request.data, request.value])
  if (!transaction) return null
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
        />
        <RawText fontWeight='medium'>
          {/* TODO: what's the best way to format e.g. an ether amount with the appropriate amount of decimals? */}
          {CurrencyAmount.ether(request?.value ?? '0x0').toFixed()}
        </RawText>

        <Divider my={4} />

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

        <Divider my={4} />
        {!!transaction &&
          transaction.functionFragment.inputs.map((input: any, index: any) => {
            return (
              <Fragment key={index}>
                <RawText ml={5} color='gray.500' fontWeight='medium'>
                  {input.name} ({input.type})
                </RawText>
                {input.type === 'bytes[]' ? (
                  <HStack ml={5}>
                    <MiddleEllipsis
                      fontWeight='medium'
                      value={transaction.args[index].toString()}
                    />
                    <IconButton
                      size='small'
                      variant='ghost'
                      aria-label='Copy'
                      icon={<CopyIcon />}
                      onClick={() =>
                        navigator.clipboard.writeText(transaction.args[index].toString())
                      }
                    />
                  </HStack>
                ) : (
                  <RawText ml={5} fontWeight='normal'>
                    {transaction.args[index].toString()}
                  </RawText>
                )}
                <Divider my={4} />
              </Fragment>
            )
          })}
      </Box>
    </ModalSection>
  )
}
