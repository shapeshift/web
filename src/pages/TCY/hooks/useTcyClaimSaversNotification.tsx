import type { ToastId } from '@chakra-ui/react'
import { useToast } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { TcyClaimSaversNotification } from '@/components/Layout/Header/ActionCenter/components/Notifications/TcyClaimSaversNotification'
import { useWallet } from '@/hooks/useWallet/useWallet'
import { ActionStatus } from '@/state/slices/actionSlice/types'
import { selectTcyClaimActionsByWallet } from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

export const useTcyClaimSaversNotification = () => {
  const toast = useToast()
  const navigate = useNavigate()
  const translate = useTranslate()

  const hasShownSessionToast = useRef(false)
  const toastIdRef = useRef<ToastId | undefined>(undefined)

  const tcyClaimActions = useAppSelector(selectTcyClaimActionsByWallet)
  const {
    state: { isConnected },
  } = useWallet()

  useEffect(() => {
    const hasClaimable = tcyClaimActions.some(claim => claim.status === ActionStatus.ClaimAvailable)

    // Everything already claimed or swapped to wallet with no claims (close toast)
    if (!hasClaimable && toastIdRef.current) {
      toast.close(toastIdRef.current)
    }

    if (!hasClaimable || hasShownSessionToast.current || !isConnected) return

    hasShownSessionToast.current = true

    const _toastIdRef = toast({
      render: ({ onClose }) => {
        const handleClick = () => {
          navigate('/tcy')
          onClose()
        }

        // eslint-disable-next-line react-memo/require-usememo
        return <TcyClaimSaversNotification handleClick={handleClick} onClose={onClose} />
      },
      id: 'tcy-claim-alert',
      duration: null,
      isClosable: true,
      position: 'bottom-right',
    })

    toastIdRef.current = _toastIdRef
  }, [navigate, toast, translate, tcyClaimActions, isConnected])
}
