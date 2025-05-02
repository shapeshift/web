import { ModalCloseButton } from '@chakra-ui/react'
import { fromAssetId, tcyAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { skipToken, useMutation, useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router'

import { TCYClaimRoute } from '../../types'
import { ClaimAddressInput } from './components/ClaimAddressInput'
import type { Claim } from './types'

import { ReusableConfirm } from '@/components/ReusableConfirm/ReusableConfirm'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { bn } from '@/lib/bignumber/bignumber'
import { fromBaseUnit } from '@/lib/math'
import { getThorchainFromAddress } from '@/lib/utils/thorchain'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { isUtxoChainId } from '@/lib/utils/utxo'
import { useIsSweepNeededQuery } from '@/pages/Lending/hooks/useIsSweepNeededQuery'
import { getThorchainSaversPosition } from '@/state/slices/opportunitiesSlice/resolvers/thorchainsavers/utils'
import {
  selectAssetById,
  selectMarketDataByAssetIdUserCurrency,
  selectPortfolioAccountMetadataByAccountId,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ClaimConfirmProps = {
  claim: Claim
  setClaimTxid: (txId: string) => void
}

type AddressFormValues = {
  manualRuneAddress: string
}

const headerRightComponent = <ModalCloseButton />

export const ClaimConfirm = ({ claim, setClaimTxid }: ClaimConfirmProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const {
    state: { wallet, isConnected },
  } = useWallet()
  const [runeAddress, setRuneAddress] = useState<string>()
  const methods = useForm<AddressFormValues>()

  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const tcyMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, tcyAssetId),
  )

  const amountCryptoPrecision = useMemo(
    () => fromBaseUnit(claim.amountThorBaseUnit ?? '0', THOR_PRECISION),
    [claim?.amountThorBaseUnit],
  )

  const amountUserCurrency = useMemo(() => {
    return bn(amountCryptoPrecision).times(tcyMarketData.price).toFixed(2)
  }, [tcyMarketData.price, amountCryptoPrecision])

  const accountFilter = useMemo(() => ({ accountId: claim.accountId }), [claim.accountId])
  const accountMetadata = useAppSelector(state =>
    selectPortfolioAccountMetadataByAccountId(state, accountFilter),
  )

  const { data: fromAddress } = useQuery({
    queryKey: ['thorchainFromAddress', claim.accountId, claim.assetId],
    queryFn:
      wallet && accountMetadata
        ? () =>
            getThorchainFromAddress({
              accountId: claim.accountId,
              assetId: claim.assetId,
              getPosition: getThorchainSaversPosition,
              accountMetadata,
              wallet,
            })
        : skipToken,
  })

  const {
    dustAmountCryptoBaseUnit,
    isEstimatedFeesDataLoading,
    estimatedFeesData,
    executeTransaction,
  } = useSendThorTx({
    accountId: claim.accountId,
    action: 'claimTcy',
    amountCryptoBaseUnit: '0',
    assetId: claim.assetId,
    fromAddress: fromAddress ?? null,
    memo: runeAddress ? `tcy:${runeAddress}` : '',
    enableEstimateFees: Boolean(runeAddress && claim.accountId),
  })

  const isSweepNeededArgs = useMemo(
    () => ({
      assetId: claim.assetId,
      address: fromAddress ?? '',
      amountCryptoBaseUnit: dustAmountCryptoBaseUnit,
      txFeeCryptoBaseUnit: estimatedFeesData?.txFeeCryptoBaseUnit,
      enabled: Boolean(
        isUtxoChainId(fromAssetId(claim.assetId).chainId) &&
          fromAddress &&
          estimatedFeesData &&
          runeAddress,
      ),
    }),
    [claim.assetId, fromAddress, estimatedFeesData, runeAddress, dustAmountCryptoBaseUnit],
  )

  const { data: isSweepNeeded, isFetching: isSweepNeededFeching } =
    useIsSweepNeededQuery(isSweepNeededArgs)

  const { mutateAsync: handleClaim, isPending: isClaimMutationPending } = useMutation({
    mutationFn: async () => {
      if (!runeAddress) return

      const txid = await executeTransaction()
      if (!txid) throw new Error('Failed to broadcast transaction')

      return txid
    },
    onSuccess: (txid: string | undefined) => {
      if (!txid) return

      setClaimTxid(txid)
      navigate(TCYClaimRoute.Status)
    },
  })

  const handleConfirm = useCallback(async () => {
    if (isSweepNeeded) {
      return navigate(TCYClaimRoute.Sweep)
    }
    await handleClaim()
  }, [handleClaim, isSweepNeeded, navigate])

  if (!tcyAsset) return null

  return (
    <FormProvider {...methods}>
      <ReusableConfirm
        isDisabled={!isConnected || !runeAddress || isSweepNeededFeching || !estimatedFeesData}
        isLoading={isClaimMutationPending || isSweepNeededFeching || isEstimatedFeesDataLoading}
        assetId={thorchainAssetId}
        headerText={translate('TCY.claimConfirm.confirmTitle')}
        cryptoAmount={amountCryptoPrecision}
        cryptoSymbol={tcyAsset.symbol}
        fiatAmount={amountUserCurrency}
        feeAmountFiat={estimatedFeesData?.txFeeFiat}
        confirmText={translate('TCY.claimConfirm.confirmAndClaim')}
        onConfirm={handleConfirm}
        headerRightComponent={headerRightComponent}
      >
        <ClaimAddressInput onActiveAddressChange={setRuneAddress} address={runeAddress} />
      </ReusableConfirm>
    </FormProvider>
  )
}
