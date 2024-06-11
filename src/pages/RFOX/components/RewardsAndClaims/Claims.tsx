import { Box, CardBody } from '@chakra-ui/react'
import { foxAssetId } from '@shapeshiftoss/caip'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'

import { ClaimRow } from '../Claim/ClaimRow'
import { ClaimStatus } from '../Claim/types'

type ClaimsProps = {
  headerComponent: JSX.Element
}

export const Claims = ({ headerComponent }: ClaimsProps) => {
  const translate = useTranslate()
  const setConfirmedQuote = useCallback(() => {}, [])

  return (
    <CardBody>
      {headerComponent}

      <Box>
        <ClaimRow
          stakingAssetId={foxAssetId}
          key={'1'}
          amountCryptoPrecision={'1500'}
          status={ClaimStatus.CoolingDown}
          setConfirmedQuote={setConfirmedQuote}
          cooldownPeriodHuman={'1 day'}
          index={1}
          displayButton={true}
          text={translate('RFOX.unstakeFrom', { assetSymbol: 'FOX' })}
        />
        <ClaimRow
          stakingAssetId={foxAssetId}
          key={'1'}
          amountCryptoPrecision={'1500'}
          status={ClaimStatus.Available}
          setConfirmedQuote={setConfirmedQuote}
          cooldownPeriodHuman={'1 day'}
          index={1}
          displayButton={true}
          text={translate('RFOX.unstakeFrom', { assetSymbol: 'FOX' })}
        />
      </Box>
    </CardBody>
  )
}
