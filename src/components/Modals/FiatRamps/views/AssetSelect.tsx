import { ModalBody, Stack } from '@chakra-ui/react'
import { DefiModalHeader } from 'features/defi/components/DefiModal/DefiModalHeader'
import { useCallback } from 'react'
import { useTranslate } from 'react-polyglot'
import { useHistory, useParams } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import type { FiatRampAsset } from '../FiatRampsCommon'
import { FiatRampAction } from '../FiatRampsCommon'
import { useFiatRampCurrencyList } from '../hooks/useFiatRampCurrencyList'

type AssetSelectProps = {
  onAssetSelect: (asset: FiatRampAsset) => void
  selectAssetTranslation: string
}

export const AssetSelect: React.FC<AssetSelectProps> = props => {
  const { onAssetSelect, selectAssetTranslation } = props
  const { fiatRampAction } = useParams<{ fiatRampAction: FiatRampAction }>()
  const { loading, sellList, buyList } = useFiatRampCurrencyList()
  const translate = useTranslate()
  const history = useHistory()

  const handleBack = useCallback(() => {
    history.push(`/${fiatRampAction}`)
  }, [fiatRampAction, history])

  return (
    <SlideTransition>
      <DefiModalHeader onBack={handleBack} title={translate(selectAssetTranslation)} />
      <ModalBody pb={0}>
        <Stack height='338px'>
          <AssetSearch
            onClick={onAssetSelect}
            type={fiatRampAction}
            assets={fiatRampAction === FiatRampAction.Buy ? buyList : sellList}
            loading={loading}
          />
        </Stack>
      </ModalBody>
    </SlideTransition>
  )
}
