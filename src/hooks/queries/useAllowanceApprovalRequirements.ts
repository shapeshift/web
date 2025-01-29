import type { UseIsApprovalRequiredProps } from './useIsAllowanceApprovalRequired'
import { useIsAllowanceApprovalRequired } from './useIsAllowanceApprovalRequired'
import { useIsAllowanceResetRequired } from './useIsAllowanceResetRequired'

// Convenience wrapper to avoid necessity to call both hooks in common case
export const useAllowanceApprovalRequirements = ({
  assetId,
  amountCryptoBaseUnit,
  from,
  spender,
  isDisabled,
}: UseIsApprovalRequiredProps) => {
  const { allowanceCryptoBaseUnitResult, isAllowanceApprovalRequired } =
    useIsAllowanceApprovalRequired({
      assetId,
      amountCryptoBaseUnit,
      from,
      spender,
      isDisabled,
    })

  const { isAllowanceResetRequired, isLoading: isAllowanceResetRequirementsLoading } =
    useIsAllowanceResetRequired({
      assetId,
      amountCryptoBaseUnit,
      from,
      spender,
      isDisabled,
    })

  return {
    isAllowanceApprovalRequired,
    isAllowanceResetRequired,
    isLoading: allowanceCryptoBaseUnitResult.isLoading || isAllowanceResetRequirementsLoading,
  }
}
