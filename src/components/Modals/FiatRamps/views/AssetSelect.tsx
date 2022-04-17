import { ArrowBackIcon } from '@chakra-ui/icons'
import { Flex, IconButton, Stack } from '@chakra-ui/react'
import { useHistory, useParams } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import { FiatRamp } from '../config'
import { FiatRampAction, FiatRampCurrencyBase } from '../FiatRampsCommon'
import { useFiatRampCurrencyList } from '../hooks/useFiatRampCurrencyList'

type AssetSelectProps = {
  fiatRampProvider: FiatRamp
  onAssetSelect: (asset: FiatRampCurrencyBase) => void
  walletSupportsAsset: boolean
  selectAssetTranslation: string
}

export const AssetSelect: React.FC<AssetSelectProps> = props => {
  const { fiatRampProvider, onAssetSelect, walletSupportsAsset, selectAssetTranslation } = props
  const { goBack } = useHistory()
  const { fiatRampAction } = useParams<{ fiatRampAction: FiatRampAction }>()
  const { loading, sellList, buyList } = useFiatRampCurrencyList(
    fiatRampProvider,
    walletSupportsAsset,
  )

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
