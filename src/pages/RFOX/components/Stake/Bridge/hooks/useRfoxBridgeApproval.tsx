import { ExternalLinkIcon } from '@chakra-ui/icons'
import { Link, Text, useToast } from '@chakra-ui/react'
import { fromAccountId, fromAssetId } from '@shapeshiftoss/caip'
import { TxStatus } from '@shapeshiftoss/unchained-client'
import type { UseQueryResult } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import { reactQueries } from 'react-queries'
import { useAllowance } from 'react-queries/hooks/useAllowance'
import { encodeFunctionData, erc20Abi, getAddress } from 'viem'
import type { EvmFees } from 'hooks/queries/useEvmFees'
import { useEvmFees } from 'hooks/queries/useEvmFees'
import { useWallet } from 'hooks/useWallet/useWallet'
import { bnOrZero } from 'lib/bignumber/bignumber'
import type {
  GetFeesWithWalletEip1559SupportArgs,
  MaybeGetFeesWithWalletEip1559Args,
} from 'lib/utils/evm'
import { assertGetEvmChainAdapter, isGetFeesWithWalletEIP1559SupportArgs } from 'lib/utils/evm'
import { selectTxById } from 'state/slices/selectors'
import { serializeTxIndex } from 'state/slices/txHistorySlice/utils'
import { useAppSelector } from 'state/store'

import type { RfoxBridgeQuote } from '../types'
import { useRfoxBridge } from './useRfoxBridge'

type UseRfoxBridgeApprovalProps = { confirmedQuote: RfoxBridgeQuote }
type UseRfoxBridgeApprovalReturn = {
  isApprovalRequired: boolean
  allowanceQuery: UseQueryResult<string | undefined, Error>
  isGetApprovalFeesEnabled: boolean
  approvalFeesQuery: UseQueryResult<EvmFees, Error>
  isApprovalTxPending: boolean
  isApprovalTxSuccess: boolean
  handleApprove: () => Promise<string>
  isTransitioning: boolean
}

export const useRfoxBridgeApproval = ({
  confirmedQuote,
}: UseRfoxBridgeApprovalProps): UseRfoxBridgeApprovalReturn => {
  const queryClient = useQueryClient()
  const toast = useToast()
  const translate = useTranslate()
  const wallet = useWallet().state.wallet
  const [approvalTxHash, setApprovalTxHash] = useState<string>()
  const { sellAssetAccountNumber, feeAsset, allowanceContract } = useRfoxBridge({ confirmedQuote })

  const adapter = useMemo(
    () => (feeAsset ? assertGetEvmChainAdapter(fromAssetId(feeAsset.assetId).chainId) : undefined),
    [feeAsset],
  )

  const allowanceQuery = useAllowance({
    assetId: confirmedQuote.sellAssetId,
    spender: allowanceContract,
    from: fromAccountId(confirmedQuote.sellAssetAccountId).account,
  })

  const isApprovalRequired = useMemo(
    () => bnOrZero(allowanceQuery.data).lt(confirmedQuote.bridgeAmountCryptoBaseUnit),
    [allowanceQuery.data, confirmedQuote.bridgeAmountCryptoBaseUnit],
  )

  const approvalCallData = useMemo(() => {
    if (!allowanceContract) return

    return encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [getAddress(allowanceContract), BigInt(confirmedQuote.bridgeAmountCryptoBaseUnit)],
    })
  }, [allowanceContract, confirmedQuote.bridgeAmountCryptoBaseUnit])

  const approvalMutation = useMutation({
    ...reactQueries.mutations.approve({
      assetId: confirmedQuote.sellAssetId,
      spender: allowanceContract!, // see handleApprove below
      amountCryptoBaseUnit: confirmedQuote.bridgeAmountCryptoBaseUnit,
      wallet: wallet ?? undefined,
      from: fromAccountId(confirmedQuote.sellAssetAccountId).account,
      accountNumber: sellAssetAccountNumber,
    }),
    onSuccess: (txHash: string) => {
      setApprovalTxHash(txHash)
      toast({
        title: translate('modals.send.transactionSent'),
        description: (
          <Text>
            {feeAsset?.explorerTxLink && (
              <Link href={`${feeAsset.explorerTxLink}${txHash}`} isExternal>
                {translate('modals.status.viewExplorer')} <ExternalLinkIcon mx='2px' />
              </Link>
            )}
          </Text>
        ),
        status: 'success',
        duration: 9000,
        isClosable: true,
        position: 'top-right',
      })
    },
  })

  const serializedApprovalTxIndex = useMemo(() => {
    if (!approvalTxHash) return
    return serializeTxIndex(
      confirmedQuote.sellAssetAccountId,
      approvalTxHash,
      fromAccountId(confirmedQuote.sellAssetAccountId).account,
    )
  }, [approvalTxHash, confirmedQuote.sellAssetAccountId])

  const isGetApprovalFeesEnabled = useCallback(
    (input: MaybeGetFeesWithWalletEip1559Args): input is GetFeesWithWalletEip1559SupportArgs =>
      Boolean(isApprovalRequired && isGetFeesWithWalletEIP1559SupportArgs(input)),
    [isApprovalRequired],
  )

  const approvalFeesQueryInput = useMemo(
    () => ({
      value: '0',
      accountNumber: sellAssetAccountNumber,
      to: fromAssetId(confirmedQuote.sellAssetId).assetReference,
      from: fromAccountId(confirmedQuote.sellAssetAccountId).account,
      data: approvalCallData,
      chainId: fromAssetId(confirmedQuote.sellAssetId).chainId,
    }),
    [
      approvalCallData,
      confirmedQuote.sellAssetAccountId,
      confirmedQuote.sellAssetId,
      sellAssetAccountNumber,
    ],
  )

  const getFeesWithWalletInput = useMemo(
    () => ({ ...approvalFeesQueryInput, adapter, wallet }),
    [adapter, approvalFeesQueryInput, wallet],
  )
  const approvalFeesQuery = useEvmFees({
    ...approvalFeesQueryInput,
    enabled: isGetApprovalFeesEnabled(getFeesWithWalletInput),
    staleTime: 30_000,
    // Ensures fees are refetched at an interval, including when the app is in the background
    refetchIntervalInBackground: true,
    // Yeah this is arbitrary but come on, Arb is cheap
    refetchInterval: isGetApprovalFeesEnabled(getFeesWithWalletInput) ? 15_000 : false,
  })

  const approvalTx = useAppSelector(gs => selectTxById(gs, serializedApprovalTxIndex ?? ''))

  const isApprovalTxPending = useMemo(
    () =>
      approvalMutation.isPending ||
      (approvalMutation.isSuccess && approvalTx?.status !== TxStatus.Confirmed),
    [approvalMutation.isPending, approvalMutation.isSuccess, approvalTx?.status],
  )

  const isApprovalTxSuccess = useMemo(
    () => approvalTx?.status === TxStatus.Confirmed,
    [approvalTx?.status],
  )

  // The approval Tx may be confirmed, but that's not enough to know we're ready to bridge
  // Allowance then needs to be succesfully refetched - failure to wait for it will result in jumpy states between
  // the time the Tx is confirmed, and the time the allowance is succesfully refetched
  // This allows us to detect such transition state
  const isTransitioning = useMemo(() => {
    // If we don't have a success Tx, we know we're not transitioning
    if (!isApprovalTxSuccess) return false
    // We have a success approval Tx, but approval is still required, meaning we haven't re-rendered with the updated allowance just yet
    if (isApprovalRequired) return true

    // Allowance has been updated, we've finished transitioning
    return false
  }, [isApprovalRequired, isApprovalTxSuccess])

  const handleApprove = useCallback(() => {
    if (!allowanceContract) return Promise.reject('allowanceContract is required')

    return approvalMutation.mutateAsync()
  }, [allowanceContract, approvalMutation])

  useEffect(() => {
    if (!allowanceContract) return
    if (!approvalTx) return
    if (isApprovalTxPending) return

    queryClient.invalidateQueries(
      reactQueries.common.allowanceCryptoBaseUnit(
        confirmedQuote.sellAssetId,
        allowanceContract,
        fromAccountId(confirmedQuote.sellAssetAccountId).account,
      ),
    )
  }, [
    approvalTx,
    isApprovalTxPending,
    queryClient,
    allowanceContract,
    confirmedQuote.sellAssetId,
    confirmedQuote.sellAssetAccountId,
  ])

  return {
    isApprovalRequired,
    allowanceQuery,
    isGetApprovalFeesEnabled: isGetApprovalFeesEnabled(getFeesWithWalletInput),
    approvalFeesQuery,
    isApprovalTxPending,
    isApprovalTxSuccess,
    handleApprove,
    isTransitioning,
  }
}
