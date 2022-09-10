import { Flex, Stack } from '@chakra-ui/react'
import { useParams } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import type { FiatRamp } from '../config'
import type { FiatRampAsset } from '../FiatRampsCommon'
import { FiatRampAction } from '../FiatRampsCommon'
import { useFiatRampCurrencyList } from '../hooks/useFiatRampCurrencyList'

type AssetSelectProps = {
  fiatRampProvider: FiatRamp
  onAssetSelect: (asset: FiatRampAsset) => void
  selectAssetTranslation: string
}

export const AssetSelect: React.FC<AssetSelectProps> = props => {
  const { fiatRampProvider, onAssetSelect, selectAssetTranslation } = props
  const { fiatRampAction } = useParams<{ fiatRampAction: FiatRampAction }>()
  const { loading, sellList, buyList } = useFiatRampCurrencyList(fiatRampProvider)

  return (
    <SlideTransition>
      <Stack height='338px'>
        <Flex>
          <Text alignSelf='center' translation={selectAssetTranslation} />
        </Flex>
        <AssetSearch
          onClick={onAssetSelect}
          type={fiatRampAction}
          assets={fiatRampAction === FiatRampAction.Buy ? buyList : sellList}
          loading={loading}
        />
      </Stack>
    </SlideTransition>
  )
}
