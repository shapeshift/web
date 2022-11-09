import { Box, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { useGetFiatRampsQuery } from 'state/apis/fiatRamps/fiatRamps'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import { FiatRampAction } from '../FiatRampsCommon'

type AssetSelectProps = {
  handleAssetSelect: (assetId: AssetId) => void
  selectAssetTranslation: string
  fiatRampAction: FiatRampAction
}

export const AssetSelect: React.FC<AssetSelectProps> = props => {
  const { handleAssetSelect, selectAssetTranslation, fiatRampAction } = props
  const { data: ramps, isLoading } = useGetFiatRampsQuery()
  const translate = useTranslate()
  const history = useHistory()

  const handleBack = useCallback(
    () => history.push(`/${fiatRampAction}`),
    [fiatRampAction, history],
  )

  const assetIds = useMemo(
    () =>
      fiatRampAction === FiatRampAction.Buy ? ramps?.buyAssetIds ?? [] : ramps?.sellAssetIds ?? [],
    [fiatRampAction, ramps],
  )
  if (isLoading) return null
  if (!ramps) return null

  return (
    <SlideTransition>
      <DefiModalHeader onBack={handleBack} title={translate(selectAssetTranslation)} />
      <Box p={6} pb={0}>
        <Stack height='338px'>
          <AssetSearch onClick={handleAssetSelect} action={fiatRampAction} assetIds={assetIds} />
        </Stack>
      </Box>
    </SlideTransition>
  )
}
