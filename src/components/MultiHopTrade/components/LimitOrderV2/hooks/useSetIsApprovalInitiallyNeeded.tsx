import { COW_SWAP_VAULT_RELAYER_ADDRESS } from '@shapeshiftoss/swapper'
import { useEffect, useMemo } from 'react'
import { useIsAllowanceApprovalRequired } from 'hooks/queries/useIsAllowanceApprovalRequired'
import { useIsAllowanceResetRequired } from 'hooks/queries/useIsAllowanceResetRequired'
import { limitOrderSlice } from 'state/slices/limitOrderSlice/limitOrderSlice'
import {
  selectActiveQuote,
  selectLimitOrderSubmissionMetadata,
} from 'state/slices/limitOrderSlice/selectors'
import { useAppDispatch, useAppSelector, useSelectorWithArgs } from 'state/store'

export const useSetIsApprovalInitiallyNeeded = () => {
  const dispatch = useAppDispatch()
  const activeQuote = useAppSelector(selectActiveQuote)

  const orderSubmissionMetadataFilter = useMemo(() => {
    return { quoteId: activeQuote?.response.id ?? 0 }
  }, [activeQuote?.response.id])

  const { allowanceReset, allowanceApproval } = useSelectorWithArgs(
    selectLimitOrderSubmissionMetadata,
    orderSubmissionMetadataFilter,
  )

  const { allowanceCryptoBaseUnitResult, isAllowanceApprovalRequired } =
    useIsAllowanceApprovalRequired({
      amountCryptoBaseUnit: activeQuote?.params.sellAmountCryptoBaseUnit,
      assetId: activeQuote?.params.sellAssetId,
      from: activeQuote?.params.sellAccountAddress,
      spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
      isDisabled: allowanceApproval.isInitiallyRequired !== undefined,
    })

  const { isAllowanceResetRequired, isLoading: isAllowanceResetRequirementsLoading } =
    useIsAllowanceResetRequired({
      amountCryptoBaseUnit: activeQuote?.params.sellAmountCryptoBaseUnit,
      assetId: activeQuote?.params.sellAssetId,
      from: activeQuote?.params.sellAccountAddress,
      spender: COW_SWAP_VAULT_RELAYER_ADDRESS,
      isDisabled: allowanceReset.isInitiallyRequired !== undefined,
    })

  // Reset the approval requirements if the trade quote ID changes
  // IMPORTANT: This must be evaluated before the other useEffects to ensure that the initial approval requirements are reset
  useEffect(() => {
    if (!activeQuote?.response.id) return

    dispatch(
      limitOrderSlice.actions.setInitialApprovalRequirements({
        id: activeQuote.response.id,
        isAllowanceApprovalRequired: undefined,
      }),
    )
    dispatch(
      limitOrderSlice.actions.setAllowanceResetRequirements({
        id: activeQuote.response.id,
        isAllowanceResetRequired: undefined,
      }),
    )
  }, [activeQuote?.response.id, dispatch])

  useEffect(() => {
    // We already have *initial* approval requirements. The whole intent of this hook is to return initial allowance requirements,
    // so we never want to overwrite them with subsequent allowance results.
    if (
      allowanceReset.isInitiallyRequired !== undefined ||
      allowanceApproval.isInitiallyRequired !== undefined
    )
      return

    if (allowanceCryptoBaseUnitResult.isLoading || isAllowanceApprovalRequired === undefined) return
    if (isAllowanceResetRequirementsLoading || isAllowanceResetRequired === undefined) return
    if (!activeQuote?.response.id) return

    dispatch(
      limitOrderSlice.actions.setInitialApprovalRequirements({
        id: activeQuote.response.id,
        isAllowanceApprovalRequired,
      }),
    )

    dispatch(
      limitOrderSlice.actions.setAllowanceResetRequirements({
        id: activeQuote.response.id,
        isAllowanceResetRequired,
      }),
    )
  }, [
    allowanceCryptoBaseUnitResult.isLoading,
    isAllowanceApprovalRequired,
    isAllowanceResetRequirementsLoading,
    isAllowanceResetRequired,
    dispatch,
    activeQuote?.response.id,
    allowanceReset.isInitiallyRequired,
    allowanceApproval.isInitiallyRequired,
  ])

  return {
    isLoading: allowanceCryptoBaseUnitResult.isLoading || isAllowanceResetRequirementsLoading,
  }
}
