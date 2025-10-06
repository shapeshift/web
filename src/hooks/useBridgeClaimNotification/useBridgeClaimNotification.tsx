import type { ToastId } from '@chakra-ui/react'
import { usePrevious } from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { IconCircle } from '@/components/IconCircle'
import { useArbitrumClaimsByStatus } from '@/components/MultiHopTrade/components/TradeInput/components/Claim/hooks/useArbitrumClaimsByStatus'
import { TradeInputTab } from '@/components/MultiHopTrade/types'
import { useNotificationToast } from '@/hooks/useNotificationToast'
import { useWallet } from '@/hooks/useWallet/useWallet'

export const useBridgeClaimNotification = () => {
  const toast = useNotificationToast({ desktopPosition: 'bottom-right' })
  const navigate = useNavigate()
  const translate = useTranslate()
  const [isDisabled, setIsDisabled] = useState(false)
  const toastIdRef = useRef<ToastId | undefined>(undefined)

  const {
    state: { deviceId: walletDeviceId },
  } = useWallet()

  const prevDeviceId = usePrevious(walletDeviceId)

  const { claimsByStatus, isLoading } = useArbitrumClaimsByStatus({
    skip: isDisabled,
  })

  useEffect(() => {
    // Immediately close previous toast if it exists on walletId change
    if (walletDeviceId && prevDeviceId && walletDeviceId !== prevDeviceId && toastIdRef.current) {
      toast.close(toastIdRef.current)
    }
  }, [prevDeviceId, toast, walletDeviceId])

  // Re-enable the notification when wallet changes
  useEffect(() => {
    setIsDisabled(false)
  }, [walletDeviceId])

  useEffect(() => {
    if (isLoading || isDisabled) return
    if (claimsByStatus.Available.length === 0) return

    if (toastIdRef.current) {
      toast.close(toastIdRef.current)
    }

    // trigger a toast
    const _toastIdRef = toast({
      icon: (
        <IconCircle boxSize={8} color='text.subtle'>
          <FaInfoCircle />
        </IconCircle>
      ),
      title: translate('bridge.availableClaimsNotification'),
      onClick: () => navigate(`/${TradeInputTab.Claim}`),
      id: 'bridge-claim',
      duration: null,
      isClosable: true,
    })

    toastIdRef.current = _toastIdRef

    // don't spam user
    setIsDisabled(true)
  }, [claimsByStatus.Available.length, navigate, isDisabled, isLoading, toast, translate])
}
