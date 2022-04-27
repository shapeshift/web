import { ArrowBackIcon } from '@chakra-ui/icons'
import { Flex, IconButton, Stack } from '@chakra-ui/react'
import { useHistory, useParams } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import { FiatRamp } from '../config'
import { FiatRampAction, FiatRampAsset } from '../FiatRampsCommon'
import { useFiatRampCurrencyList } from '../hooks/useFiatRampCurrencyList'

type AssetSelectProps = {
  fiatRampProvider: FiatRamp
  onAssetSelect: (asset: FiatRampAsset) => void
  selectAssetTranslation: string
}

export const AssetSelect: React.FC<AssetSelectProps> = props => {
  const { fiatRampProvider, onAssetSelect, selectAssetTranslation } = props
  const { goBack } = useHistory()
  const { fiatRampAction } = useParams<{ fiatRampAction: FiatRampAction }>()
  const { loading, sellList, buyList } = useFiatRampCurrencyList(fiatRampProvider)

  return (
    <SlideTransition>
      <Stack height='338px'>
        <Flex>
          <IconButton
            icon={<ArrowBackIcon />}
            aria-label={selectAssetTranslation}
            size='sm'
            onClick={goBack}
            isRound
            variant='ghost'
            mr={2}
          />
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
