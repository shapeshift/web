import { Stack, useDisclosure } from '@chakra-ui/react'
import { btcAssetId, ethAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import type { TCYRouteProps } from '../../types'
import { ClaimModal } from './ClaimRoutes'
import { AssetClaimButton } from './components/AssetClaimButton'

import { SlideTransition } from '@/components/SlideTransition'
import { RawText } from '@/components/Text'

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
            assetSymbol='BTC'
            assetAmount='100'
            claimAction={translate('TCY.claim')}
            onClick={handleClick}
          />
        </Stack>
        <Stack px={2} pb={2} spacing={2}>
          <RawText px={4} color='text.subtle'>
            {translate('TCY.claimSelect.unavailableClaims')}
          </RawText>
          <AssetClaimButton
            isDisabled
            assetId={ethAssetId}
            assetName='Ethereum'
            assetSymbol='ETH'
            assetAmount='100'
            claimAction={translate('TCY.claimSelect.notEligible')}
          />
        </Stack>
      </Stack>
      <ClaimModal isOpen={isOpen} onClose={onClose} />
    </SlideTransition>
  )
}
