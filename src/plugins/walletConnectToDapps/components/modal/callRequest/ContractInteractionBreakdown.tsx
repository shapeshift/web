import { CopyIcon } from '@chakra-ui/icons'
import { Box, Divider, HStack, IconButton } from '@chakra-ui/react'
import { CHAIN_NAMESPACE } from '@shapeshiftoss/caip'
import type { WalletConnectEthSendTransactionCallRequest } from '@shapeshiftoss/hdwallet-walletconnect-bridge/dist/types'
import startCase from 'lodash/startCase'
import type { FC } from 'react'
import { Fragment, useMemo } from 'react'
import { FaCode } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { Amount } from 'components/Amount/Amount'
import { MiddleEllipsis } from 'components/MiddleEllipsis/MiddleEllipsis'
import { RawText, Text } from 'components/Text'
import { getChainAdapterManager } from 'context/PluginProvider/chainAdapterSingleton'
import { selectContractByAddress } from 'state/apis/abi/selectors'
import { selectAssets } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { ModalSection } from './ModalSection'

type Props = {
  request: WalletConnectEthSendTransactionCallRequest['params'][number]
}

export const ContractInteractionBreakdown: FC<Props> = ({ request }) => {
  const translate = useTranslate()

  const { contract } = useAppSelector(s => selectContractByAddress(s, request.to))
  const transaction = useMemo(
    () => contract?.parseTransaction({ data: request.data, value: request.value }),
    [contract, request.data, request.value],
  )

  const evmChainId = request.chainId
  const assets = useAppSelector(selectAssets)
  const symbol = useMemo(() => {
    const chainId = `${CHAIN_NAMESPACE.Evm}${evmChainId}`
    const feeAssetId = getChainAdapterManager().get(chainId)?.getFeeAssetId()
    if (!feeAssetId) return '?'
    const feeAsset = assets[feeAssetId]
    if (!feeAsset) return '?'
    return feeAsset.symbol
  }, [assets, evmChainId])

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
          <Amount.Crypto value={request.value} symbol={symbol} />
        </RawText>
        <Divider my={4} />
        {!!transaction &&
          transaction.functionFragment.inputs.map((input, index) => (
            <Fragment key={index}>
              <RawText color='gray.500' fontWeight='medium'>
                {startCase(input.name)} ({input.type})
              </RawText>
              {input.type === 'bytes[]' ? (
                <HStack>
                  <MiddleEllipsis fontWeight='medium' value={transaction.args[index].toString()} />
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
                <RawText fontWeight='normal'>{transaction.args[index].toString()}</RawText>
              )}
              <Divider my={4} />
            </Fragment>
          ))}

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
  )
}
