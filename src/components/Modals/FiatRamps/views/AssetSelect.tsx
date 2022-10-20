import { ModalBody, Stack } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import { useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useParams } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { useGetFiatRampsQuery } from 'state/apis/fiatRamps/fiatRamps'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import { FiatRampAction } from '../FiatRampsCommon'

type AssetSelectProps = {
  onAssetSelect: (assetId: AssetId) => void
  selectAssetTranslation: string
}

export const AssetSelect: React.FC<AssetSelectProps> = props => {
  const { onAssetSelect, selectAssetTranslation } = props
  const { fiatRampAction } = useParams<{ fiatRampAction: FiatRampAction }>()
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
      <ModalBody pb={0}>
        <Stack height='338px'>
          <AssetSearch onClick={onAssetSelect} action={fiatRampAction} assetIds={assetIds} />
        </Stack>
      </ModalBody>
    </SlideTransition>
  )
}
