import { ModalCloseButton } from '@chakra-ui/react'
import { fromAccountId, tcyAssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { useMutation } from '@tanstack/react-query'
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
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'
import { useSendThorTx } from '@/lib/utils/thorchain/hooks/useSendThorTx'
import { selectAssetById, selectMarketDataByAssetIdUserCurrency } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type ClaimConfirmProps = {
  claim: Claim | undefined
  setClaimTxid: (txId: string) => void
}

type AddressFormValues = {
  manualRuneAddress: string
}

const headerRightComponent = <ModalCloseButton />

export const ClaimConfirm = ({ claim, setClaimTxid }: ClaimConfirmProps) => {
  const navigate = useNavigate()
  const translate = useTranslate()
  const { state: walletState } = useWallet()
  const [runeAddress, setRuneAddress] = useState<string>()
  const methods = useForm<AddressFormValues>()

  const tcyAsset = useAppSelector(state => selectAssetById(state, tcyAssetId))
  const tcyMarketData = useAppSelector(state =>
    selectMarketDataByAssetIdUserCurrency(state, tcyAssetId),
  )

  const amountCryptoPrecision = useMemo(
    () => fromBaseUnit(claim?.amountThorBaseUnit ?? '0', THOR_PRECISION),
    [claim?.amountThorBaseUnit],
  )

  const amountUserCurrency = useMemo(() => {
    return bn(amountCryptoPrecision).times(tcyMarketData.price).toFixed(2)
  }, [tcyMarketData.price, amountCryptoPrecision])

  const fromAddress = useMemo(
    () => (claim?.accountId ? fromAccountId(claim.accountId).account : null),
    [claim?.accountId],
  )

  const { estimatedFeesData, executeTransaction } = useSendThorTx({
    accountId: claim?.accountId ?? null,
    action: 'claimTcy',
    amountCryptoBaseUnit: '0',
    assetId: claim?.assetId,
    fromAddress,
    memo: runeAddress ? `tcy:${runeAddress}` : '',
    enableEstimateFees: Boolean(runeAddress && claim?.accountId),
  })

  const { mutateAsync: handleClaim, isPending: isClaimMutationPending } = useMutation({
    mutationFn: async () => {
      if (!claim || !runeAddress) return

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
    await handleClaim()
  }, [handleClaim])

  if (!claim || !tcyAsset) return null

  return (
    <FormProvider {...methods}>
      <ReusableConfirm
        isDisabled={!walletState.isConnected || !runeAddress}
        isLoading={isClaimMutationPending}
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
