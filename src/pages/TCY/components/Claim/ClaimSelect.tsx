import { Stack, useDisclosure } from '@chakra-ui/react'
import { btcAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import type { TCYRouteProps } from '../../types'
import { ClaimModal } from './ClaimRoutes'
import { AssetClaimButton } from './components/AssetClaimButton'

import { SlideTransition } from '@/components/SlideTransition'

export const ClaimSelect: React.FC<TCYRouteProps> = ({ headerComponent }) => {
  const translate = useTranslate()
  const { isOpen, onOpen, onClose } = useDisclosure()

  const handleClick = useCallback(() => {
    onOpen()
  }, [onOpen])

  return (
    <SlideTransition>
      {headerComponent}
      <Stack spacing={2}>
        <Stack px={2} pb={2} spacing={2}>
          <AssetClaimButton
            assetId={btcAssetId}
            assetName='Bitcoin'
            assetSymbol='TCY'
            assetAmount='100'
            claimAction={translate('TCY.claim')}
            onClick={handleClick}
          />
        </Stack>
      </Stack>
      <ClaimModal isOpen={isOpen} onClose={onClose} />
    </SlideTransition>
  )
}
