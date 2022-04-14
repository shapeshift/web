import { ArrowBackIcon } from '@chakra-ui/icons'
import { Flex, IconButton, Stack } from '@chakra-ui/react'
import { useHistory, useParams } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import { FiatRamps } from '../config'
import { FiatRampAction, FiatRampCurrencyForVisualization } from '../FiatRampsCommon'
import { useFiatRampCurrencyList } from '../hooks/useFiatRampCurrencyList'
import { isSupportedBitcoinAsset } from '../utils'

type AssetSelectProps = {
  fiatRampProvider: FiatRamps
  onAssetSelect: (asset: FiatRampCurrencyForVisualization, isBTC: boolean) => void
  walletSupportsBTC: boolean
  selectAssetTranslation: string
}
export const AssetSelect = ({
  fiatRampProvider,
  onAssetSelect,
  walletSupportsBTC,
  selectAssetTranslation,
}: AssetSelectProps) => {
  const { goBack } = useHistory()
  const { fiatRampAction } = useParams<{ fiatRampAction: FiatRampAction }>()
  const { loading, sellList, buyList } = useFiatRampCurrencyList(
    fiatRampProvider,
    walletSupportsBTC,
  )

  return (
    <SlideTransition>
      <Stack height='338px'>
        <Flex>
          <IconButton
            icon={<ArrowBackIcon />}
            aria-label={selectAssetTranslation}
            size='sm'
            onClick={() => goBack()}
            isRound
            variant='ghost'
            mr={2}
          />
          <Text alignSelf='center' translation={selectAssetTranslation} />
        </Flex>
        <AssetSearch
          onClick={(asset: FiatRampCurrencyForVisualization) =>
            onAssetSelect(asset, isSupportedBitcoinAsset(asset.caip19))
          }
          type={fiatRampAction}
          assets={fiatRampAction === FiatRampAction.Buy ? buyList : sellList}
          loading={loading}
        />
      </Stack>
    </SlideTransition>
  )
}
