import { ArrowBackIcon } from '@chakra-ui/icons'
import { Flex, IconButton, Stack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useHistory, useParams } from 'react-router'
import { SlideTransition } from 'components/SlideTransition'
import { Text } from 'components/Text'
import { selectPortfolioMixedHumanBalancesBySymbol } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

import { AssetSearch } from '../components/AssetSearch/AssetSearch'
import { FiatRampAction, GemCurrency } from '../FiatRamps'
import {
  fetchCoinifySupportedCurrencies,
  fetchWyreSupportedCurrencies,
  isSupportedBitcoinAsset,
  parseGemBuyAssets,
  parseGemSellAssets
} from '../utils'

type AssetSelectProps = {
  onAssetSelect: (asset: GemCurrency, isBTC: boolean) => void
  walletSupportsBTC: boolean
  selectAssetTranslation: string
}
export const AssetSelect = ({
  onAssetSelect,
  walletSupportsBTC,
  selectAssetTranslation
}: AssetSelectProps) => {
  const history = useHistory()
  const { fiatRampAction } = useParams<{ fiatRampAction: FiatRampAction }>()
  const [buyList, setBuyList] = useState<any>([])
  const [sellList, setSellList] = useState<any>([])
  const [coinifyAssets, setCoinifyAssets] = useState<any>([])
  const [wyreAssets, setWyreAssets] = useState<any>([])
  const [loading, setLoading] = useState(false)
  const onArrowClick = () => {
    history.goBack()
  }

  const balances = useAppSelector(selectPortfolioMixedHumanBalancesBySymbol)

  useEffect(() => {
    setLoading(true)
    ;(async () => {
      if (!coinifyAssets.length) {
        const coinifyAssets = await fetchCoinifySupportedCurrencies()
        setCoinifyAssets(coinifyAssets)
      }
      if (!wyreAssets.length) {
        const wyreAssets = await fetchWyreSupportedCurrencies()
        setWyreAssets(wyreAssets)
      }

      if (coinifyAssets.length && wyreAssets.length) {
        const buyList = parseGemBuyAssets(walletSupportsBTC, coinifyAssets, wyreAssets, balances)

        if (!buyList.length) return
        setBuyList(buyList)

        const sellList = parseGemSellAssets(walletSupportsBTC, coinifyAssets, wyreAssets, balances)
        if (!sellList.length) return
        setSellList(sellList)

        setLoading(false)
      }
    })()
  }, [walletSupportsBTC, coinifyAssets, wyreAssets, balances])

  return (
    <SlideTransition>
      <Stack height='338px'>
        <Flex>
          <IconButton
            icon={<ArrowBackIcon />}
            aria-label={selectAssetTranslation}
            size='sm'
            onClick={() => onArrowClick()}
            isRound
            variant='ghost'
            mr={2}
          />
          <Text alignSelf='center' translation={selectAssetTranslation} />
        </Flex>
        <AssetSearch
          onClick={(asset: GemCurrency) =>
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
