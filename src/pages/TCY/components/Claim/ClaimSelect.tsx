import { Stack } from '@chakra-ui/react'
import { useCallback } from 'react'
import { useNavigate } from 'react-router'

import type { TCYRouteProps } from '../../types'
import { TCYClaimRoute } from '../../types'
import { AssetClaimButton } from './components/AssetClaimButton'

import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'

export const ClaimSelect: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  const navigate = useNavigate()

  const handleClick = useCallback(() => {
    navigate(TCYClaimRoute.Confirm)
  }, [navigate])

  return (
    <SlideTransition>
      {headerComponent}
      <Stack spacing={2}>
        <Stack px={2} pb={2} spacing={2}>
          <AssetClaimButton onClick={handleClick} />
        </Stack>
        <Stack px={2} pb={2} spacing={2}>
          <RawText px={4} color='text.subtle'>
            Unavailable Claims
          </RawText>
          <AssetClaimButton isDisabled />
        </Stack>
      </Stack>
    </SlideTransition>
  )
}
