import { useCallback } from 'react'
import { fox } from 'test/mocks/assets'
import { ClaimRow } from 'components/ClaimRow/ClaimRow'
import { ClaimStatus } from 'components/ClaimRow/types'

export const Claims = () => {
  const tooltipText = 'tooltip text'
  const actionText = 'action text'
  const statusText = 'status text'
  const stakingAsset = fox
  const handleClaimClick = useCallback(() => {}, [])
  return (
    <>
      <ClaimRow
        amountCryptoPrecision={'234.234523'}
        tooltipText={tooltipText}
        // Claim button currently disabled as we don't support dashboard claim button click (yet?)
        onClaimClick={handleClaimClick}
        asset={stakingAsset}
        actionText={actionText}
        statusText={statusText}
        status={ClaimStatus.NotYetAvailable}
      />
      <ClaimRow
        amountCryptoPrecision={'43.1234'}
        tooltipText={tooltipText}
        // Claim button currently disabled as we don't support dashboard claim button click (yet?)
        onClaimClick={handleClaimClick}
        asset={stakingAsset}
        actionText={actionText}
        statusText={statusText}
        status={ClaimStatus.NotYetAvailable}
      />
      <ClaimRow
        amountCryptoPrecision={'423.213454'}
        tooltipText={tooltipText}
        // Claim button currently disabled as we don't support dashboard claim button click (yet?)
        onClaimClick={handleClaimClick}
        asset={stakingAsset}
        actionText={actionText}
        statusText={statusText}
        status={ClaimStatus.Available}
      />
    </>
  )
}
