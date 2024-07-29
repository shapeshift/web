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
import { type AssetId, thorchainAssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { EmptyOverview } from 'features/defi/components/EmptyOverview/EmptyOverview'
import type { ChangeEvent } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslate } from 'react-polyglot'
import SaversVaultTop from 'assets/savers-vault-top.png'
import { AssetIcon } from 'components/AssetIcon'
import { FiatRampAction } from 'components/Modals/FiatRamps/FiatRampsCommon'
import { RawText, Text } from 'components/Text'
import type { TextPropTypes } from 'components/Text/Text'
import { useModal } from 'hooks/useModal/useModal'
import { bnOrZero } from 'lib/bignumber/bignumber'
import { selectSupportsFiatRampByAssetId } from 'state/apis/fiatRamps/selectors'
import {
  selectAssetById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
  selectWalletConnectedChainIdsSorted,
} from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ThorchainSaversEmptyProps = {
  assetId: AssetId
  onClick?: () => void
}

export const ThorchainSaversEmpty = ({ assetId, onClick }: ThorchainSaversEmptyProps) => {
  const translate = useTranslate()
  const { open: openFiatRamp } = useModal('fiatRamps')
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const filter = useMemo(() => ({ assetId }), [assetId])
  const assetSupportsBuy = useAppSelector(s => selectSupportsFiatRampByAssetId(s, filter))
  const cryptoBalance =
    useAppSelector(state => selectPortfolioCryptoPrecisionBalanceByFilter(state, filter)) ?? '0'
  const linkColor = useColorModeValue('blue.500', 'blue.200')
  const textShadow = useColorModeValue(
    '--chakra-colors-blackAlpha-50',
    '--chakra-colors-blackAlpha-400',
  )
  const backgroundColor = useColorModeValue('gray.100', 'darkNeutralAlpha.700')
  const isRunePool = assetId === thorchainAssetId

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
    () => ['common.needAsset', { asset: asset?.name }],
    [asset?.name],
  )

  const saversVaultDescriptionTranslation: TextPropTypes['translation'] = useMemo(
    () => [
      isRunePool
        ? 'defi.modals.saversVaults.runePoolDescription'
        : 'defi.modals.saversVaults.description',
      { asset: asset?.symbol },
    ],
    [asset?.symbol, isRunePool],
  )

  const renderFooter = useMemo(() => {
    return (
      <Flex flexDir='column' gap={4} width='full'>
        {bnOrZero(cryptoBalance).eq(0) && assetSupportsBuy}
        <Alert status='info' justifyContent='space-between' borderRadius='xl'>
          <Flex gap={2} alignItems='center'>
            <AssetIcon assetId={asset?.assetId} size='sm' />
            <Text fontWeight='bold' letterSpacing='-0.02em' translation={needAssetTranslation} />
          </Flex>
          <Button variant='ghost' size='sm' colorScheme='blue' onClick={handleAssetBuyClick}>
            {translate('common.buyNow')}
          </Button>
        </Alert>
        <Box borderRadius='xl' background={backgroundColor}>
          <Checkbox isChecked={hasAgreed} onChange={handleHasAgreed} p={4}>
            {translate('defi.modals.saversVaults.agreeRunePool.1')}
            <Link color={linkColor} isExternal href='#' marginLeft={1}>
              {translate('defi.modals.saversVaults.agreeRunePool.2')}
            </Link>
          </Checkbox>
        </Box>
        <Tooltip label={translate('defi.noAccountsOpportunities')} isDisabled={hasAccounts}>
          <Button
            size='lg'
            width='full'
            colorScheme='blue'
            isDisabled={!hasAccounts || (!hasAgreed && isRunePool)}
            onClick={onClick}
          >
            <Text translation='common.continue' />
          </Button>
        </Tooltip>
      </Flex>
    )
  }, [
    asset?.assetId,
    assetSupportsBuy,
    cryptoBalance,
    handleAssetBuyClick,
    needAssetTranslation,
    onClick,
    translate,
    hasAccounts,
    handleHasAgreed,
    hasAgreed,
    linkColor,
    backgroundColor,
    isRunePool,
  ])

  const emptyOverviewAssets = useMemo(() => (asset ? [asset] : []), [asset])

  const description = useMemo(() => {
    if (isRunePool) return 'defi.modals.saversVaults.introducingRunePool'

    return 'defi.modals.saversVaults.introducingRunePool'
  }, [isRunePool])

  if (!asset) return null

  return (
    <DefiModalContent
      borderRadius='2xl'
      backgroundImage={SaversVaultTop}
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
            translation={description}
            textShadow={`0 2px 2px var(${textShadow})`}
          />

          <Text
            fontSize='lg'
            translation={saversVaultDescriptionTranslation}
            textShadow={`0 2px 2px var(${textShadow})`}
            letterSpacing='0.009em'
          />
          <RawText color='text.subtle'>
            {`${translate('defi.modals.saversVaults.risksBody.1')} `}
            <Link
              color={linkColor}
              isExternal
              href='https://medium.com/thorchain/thorchain-savers-vaults-fc3f086b4057'
            >
              {translate('defi.modals.saversVaults.risksBody.2')}
            </Link>
            {` ${translate(
              isRunePool
                ? 'defi.modals.saversVaults.risksBody.runePool'
                : 'defi.modals.saversVaults.risksBody.3',
            )}`}
          </RawText>
        </Stack>
      </EmptyOverview>
    </DefiModalContent>
  )
}
