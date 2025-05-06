import { ModalCloseButton, Stack } from '@chakra-ui/react'
import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router'

import { TCYClaimRoute } from '../../types'
import { ReusableStatus } from '../ReusableStatus'
import type { Claim } from './types'

import { DialogHeader } from '@/components/Modal/components/DialogHeader'
import { Text } from '@/components/Text'
import { fromBaseUnit } from '@/lib/math'
import { THOR_PRECISION } from '@/lib/utils/thorchain/constants'

type ClaimStatusProps = {
  claim: Claim | undefined
  txId: string
  setClaimTxid: (txId: string) => void
  onTxConfirmed: () => Promise<void>
}

export const ClaimStatus: React.FC<ClaimStatusProps> = ({
  claim,
  txId,
  setClaimTxid,
  onTxConfirmed: handleTxConfirmed,
}) => {
  const navigate = useNavigate()
  const amountCryptoPrecision = useMemo(
    () => fromBaseUnit(claim?.amountThorBaseUnit ?? '0', THOR_PRECISION),
    [claim?.amountThorBaseUnit],
  )

  const handleGoBack = useCallback(() => {
    navigate(TCYClaimRoute.Select)
  }, [navigate])

  if (!claim) return null

  return (
    <>
      <DialogHeader>
        <DialogHeader.Right>
          <ModalCloseButton onClick={handleGoBack} />
        </DialogHeader.Right>
        <DialogHeader.Middle>
          <Text translation='TCY.claimConfirm.confirmTitle' />
        </DialogHeader.Middle>
      </DialogHeader>
      <Stack>
        <ReusableStatus
          txId={txId}
          setTxId={setClaimTxid}
          onTxConfirmed={handleTxConfirmed}
          translationPrefix='claim'
          accountId={claim.accountId}
          amountCryptoPrecision={amountCryptoPrecision}
          isDialog={false}
          displayGoBack={false}
        />
      </Stack>
    </>
  )
}
