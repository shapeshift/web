import { ArrowBackIcon } from '@chakra-ui/icons'
import { Flex, IconButton, Stack } from '@chakra-ui/react'
import { useHistory, useParams } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import { FiatRamp } from '../config'
import { FiatRampAction, FiatRampCurrencyBase } from '../FiatRampsCommon'
import { useFiatRampCurrencyList } from '../hooks/useFiatRampCurrencyList'
import { isSupportedBitcoinAsset } from '../utils'

type AssetSelectProps = {
  fiatRampProvider: FiatRamp
  onAssetSelect: (asset: FiatRampCurrencyBase, isBTC: boolean) => void
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
            onClick={goBack}
            isRound
            variant='ghost'
            mr={2}
          />
          <Text alignSelf='center' translation={selectAssetTranslation} />
        </Flex>
        <AssetSearch
          onClick={(asset: FiatRampCurrencyBase) =>
            onAssetSelect(asset, isSupportedBitcoinAsset(asset.assetId))
          }
          type={fiatRampAction}
          assets={fiatRampAction === FiatRampAction.Buy ? buyList : sellList}
          loading={loading}
        />
      </Stack>
    </SlideTransition>
  )
}
