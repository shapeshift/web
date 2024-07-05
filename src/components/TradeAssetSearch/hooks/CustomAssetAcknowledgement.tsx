import { Box, Checkbox, useColorModeValue } from '@chakra-ui/react'
import type { Asset } from '@shapeshiftoss/types'
import { type PropsWithChildren, useCallback, useMemo } from 'react'
import { useTranslate } from 'react-polyglot'
import { WarningAcknowledgement } from 'components/Acknowledgement/Acknowledgement'
import { useToggle } from 'hooks/useToggle/useToggle'
import { assets as assetsSlice } from 'state/slices/assetsSlice/assetsSlice'
import { marketData as marketDataSlice } from 'state/slices/marketDataSlice/marketDataSlice'
import { useAppDispatch } from 'state/store'

type CustomAssetAcknowledgementProps = {
  assetToImport: Asset | undefined
  handleAssetClick: (asset: Asset) => void
  shouldShowWarningAcknowledgement: boolean
  setShouldShowWarningAcknowledgement: (shouldShow: boolean) => void
} & PropsWithChildren

export const CustomAssetAcknowledgement: React.FC<CustomAssetAcknowledgementProps> = ({
  children,
  assetToImport,
  handleAssetClick,
  shouldShowWarningAcknowledgement,
  setShouldShowWarningAcknowledgement,
}) => {
  const translate = useTranslate()
  const dispatch = useAppDispatch()

  const [hasAcknowledged, toggleHasAcknowledged] = useToggle(false)

  const onImportClick = useCallback(() => {
    if (!assetToImport) return

    // Add asset to the store
    dispatch(assetsSlice.actions.upsertAsset(assetToImport))

    // Add market data to the store
    dispatch(
      marketDataSlice.actions.setCryptoMarketData({
        [assetToImport.assetId]: { price: '0', marketCap: '0', volume: '0', changePercent24Hr: 0 },
      }),
    )

    // Once the custom asset is in the store, proceed as if it was a normal asset
    handleAssetClick(assetToImport)
  }, [dispatch, handleAssetClick, assetToImport])

  const checkboxTextColor = useColorModeValue('gray.800', 'gray.50')
  const customAssetCheckbox = useMemo(
    () => (
      <Box py={4} textAlign='left' color={checkboxTextColor}>
        <Checkbox onChange={toggleHasAcknowledged} fontWeight='bold' py={2}>
          {translate('customTokenAcknowledgement.understand')}
        </Checkbox>
      </Box>
    ),
    [checkboxTextColor, toggleHasAcknowledged, translate],
  )

  return (
    <WarningAcknowledgement
      message={translate('warningAcknowledgement.customToken')}
      buttonTranslation='common.import'
      onAcknowledge={onImportClick}
      shouldShowAcknowledgement={shouldShowWarningAcknowledgement}
      setShouldShowAcknowledgement={setShouldShowWarningAcknowledgement}
      disableButton={!hasAcknowledged}
      content={customAssetCheckbox}
    >
      {children}
    </WarningAcknowledgement>
  )
}
