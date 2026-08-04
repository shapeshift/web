import {
  Alert,
  Box,
  Button,
  Checkbox,
  Flex,
  Link,
  Stack,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { ChangeEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'

import RunePoolTop from '@/assets/runepool-top.png'
import { AssetIcon } from '@/components/AssetIcon'
import { FiatRampAction } from '@/components/Modals/FiatRamps/FiatRampsCommon'
import { RawText, Text } from '@/components/Text'
import type { TextPropTypes } from '@/components/Text/Text'
import { DefiModalContent } from '@/features/defi/components/DefiModal/DefiModalContent'
import { EmptyOverview } from '@/features/defi/components/EmptyOverview/EmptyOverview'
import { useModal } from '@/hooks/useModal/useModal'
import { bnOrZero } from '@/lib/bignumber/bignumber'
import { selectSupportsFiatRampByAssetId } from '@/state/apis/fiatRamps/selectors'
import {
  selectAssetById,
  selectPortfolioCryptoBalanceByFilter,
  selectWalletConnectedChainIdsSorted,
} from '@/state/slices/selectors'
import { useAppSelector } from '@/state/store'

type RunePoolEmptyProps = {
  assetId: AssetId
  onClick?: () => void
}

// @TODO: update the RUNEPool link when a better article exists
const RUNEPOOL_ARTICLE_LINK =
  'https://gitlab.com/thorchain/thornode/-/blob/develop/docs/concepts/rune-pool.md'

export const RunePoolEmpty = ({ assetId, onClick }: RunePoolEmptyProps) => {
  const translate = useTranslate()
  const { open: openFiatRamp } = useModal('fiatRamps')
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const filter = useMemo(() => ({ assetId }), [assetId])
  const assetSupportsBuy = useAppSelector(s => selectSupportsFiatRampByAssetId(s, filter))
  const cryptoBalance = useAppSelector(state =>
    selectPortfolioCryptoBalanceByFilter(state, filter),
  ).toPrecision()
  const linkColor = useColorModeValue('blue.500', 'blue.200')
  const textShadow = useColorModeValue(
    '--chakra-colors-blackAlpha-50',
    '--chakra-colors-blackAlpha-400',
  )
  const backgroundColor = useColorModeValue('gray.100', 'darkNeutralAlpha.700')
  const checkboxBackground = useColorModeValue('white', 'transparent')

  const checkboxStyles = useMemo(
    () => ({
      '.chakra-checkbox__control:not([data-checked])': {
        background: checkboxBackground,
      },
    }),
    [checkboxBackground],
  )

  const [hasAgreed, setHasAgreed] = useState(false)

  const handleHasAgreed = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setHasAgreed(e.target.checked)
  }, [])

  const walletConnectedChainIdsSorted = useAppSelector(selectWalletConnectedChainIdsSorted)
  const hasAccounts = useMemo(
    () => (asset && walletConnectedChainIdsSorted.includes(asset.chainId)) ?? false,
    [walletConnectedChainIdsSorted, asset],
  )

  const handleAssetBuyClick = useCallback(() => {
    openFiatRamp({ assetId, fiatRampAction: FiatRampAction.Buy })
  }, [assetId, openFiatRamp])

  const needAssetTranslation: TextPropTypes['translation'] = useMemo(
    () => ['common.needAsset', { asset: asset?.symbol }],
    [asset?.symbol],
  )

  const descriptionTranslation: TextPropTypes['translation'] = useMemo(
    () => ['defi.modals.runePool.description', { asset: asset?.symbol }],
    [asset?.symbol],
  )

  const risksBodyTranslationComponents: TextPropTypes['components'] = useMemo(
    () => ({
      link: <Link color={linkColor} isExternal href={RUNEPOOL_ARTICLE_LINK} me={1}></Link>,
    }),
    [linkColor],
  )

  const renderFooter = useMemo(() => {
    if (!asset) return

    return (
      <Flex flexDir='column' gap={4} width='full'>
        {bnOrZero(cryptoBalance).eq(0) && assetSupportsBuy}
        <Alert status='info' justifyContent='space-between' borderRadius='xl'>
          <Flex gap={2} alignItems='center'>
            <AssetIcon assetId={asset.assetId} size='sm' />
            <Text fontWeight='bold' letterSpacing='-0.02em' translation={needAssetTranslation} />
          </Flex>
          <Button variant='ghost' size='sm' colorScheme='blue' onClick={handleAssetBuyClick}>
            {translate('common.buyNow')}
          </Button>
        </Alert>
        <Box borderRadius='xl' background={backgroundColor}>
          <Checkbox sx={checkboxStyles} isChecked={hasAgreed} onChange={handleHasAgreed} p={4}>
            {translate('defi.modals.runePool.agree')}
          </Checkbox>
        </Box>
        <Tooltip label={translate('defi.noAccountsOpportunities')} isDisabled={hasAccounts}>
          <Button
            size='lg'
            width='full'
            colorScheme='blue'
            isDisabled={!hasAccounts || !hasAgreed}
            onClick={onClick}
          >
            <Text translation='common.continue' />
          </Button>
        </Tooltip>
      </Flex>
    )
  }, [
    asset,
    cryptoBalance,
    assetSupportsBuy,
    needAssetTranslation,
    handleAssetBuyClick,
    translate,
    hasAccounts,
    handleHasAgreed,
    hasAgreed,
    backgroundColor,
    onClick,
    checkboxStyles,
  ])

  const emptyOverviewAssets = useMemo(() => (asset ? [asset] : []), [asset])

  if (!asset) return null

  return (
    <DefiModalContent
      borderRadius='2xl'
      backgroundImage={RunePoolTop}
      backgroundSize='cover'
      backgroundPosition='center -160px'
      backgroundRepeat='no-repeat'
    >
      <EmptyOverview assets={emptyOverviewAssets} footer={renderFooter}>
        <Stack spacing={4} justifyContent='center' mb={4}>
          <Text
            fontWeight='bold'
            fontSize='xl'
            letterSpacing='0.012em'
            translation='defi.modals.runePool.introducing'
            textShadow={`0 2px 2px var(${textShadow})`}
          />

          <Text
            fontSize='lg'
            translation={descriptionTranslation}
            textShadow={`0 2px 2px var(${textShadow})`}
            letterSpacing='0.009em'
          />
          <Text
            as={RawText}
            color='text.subtle'
            translation='defi.modals.runePool.risksBody'
            components={risksBodyTranslationComponents}
          />
        </Stack>
      </EmptyOverview>
    </DefiModalContent>
  )
}
