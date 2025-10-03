import {
  Box,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { fromAssetId, isNft } from '@shapeshiftoss/caip'
import { isToken } from '@shapeshiftoss/utils'
import { useCallback, useMemo } from 'react'
import { TbDots, TbExternalLink, TbEye, TbFileText } from 'react-icons/tb'
import { useTranslate } from 'react-polyglot'
import { useNavigate } from 'react-router-dom'

import { Amount } from '@/components/Amount/Amount'
import { AssetIcon } from '@/components/AssetIcon'
import { RawText } from '@/components/Text'
import { isSome } from '@/lib/utils'
import { preferences } from '@/state/slices/preferencesSlice/preferencesSlice'
import {
  selectAssetById,
  selectPortfolioCryptoPrecisionBalanceByFilter,
} from '@/state/slices/selectors'
import { useAppDispatch, useAppSelector } from '@/state/store'

const dotsIcon = <TbDots />
const eyeIcon = <TbEye />
const externalLinkIcon = <TbExternalLink />
const fileTextIcon = <TbFileText />

const hoverStylesSx = { _hover: { bg: 'gray.50', _dark: { bg: 'gray.700' } } }

type ManageHiddenAssetsListProps = {
  onClose?: () => void
}

export const ManageHiddenAssetsList: React.FC<ManageHiddenAssetsListProps> = ({ onClose }) => {
  const translate = useTranslate()
  const navigate = useNavigate()
  const appDispatch = useAppDispatch()

  const spamMarkedAssetIds = useAppSelector(preferences.selectors.selectSpamMarkedAssetIds)

  const hiddenAssets = useAppSelector(state =>
    spamMarkedAssetIds.map(assetId => selectAssetById(state, assetId)).filter(isSome),
  )

  const AssetRow: React.FC<{ assetId: AssetId }> = ({ assetId }) => {
    const asset = useAppSelector(state => selectAssetById(state, assetId))
    const assetBalanceFilter = useMemo(() => ({ assetId }), [assetId])
    const cryptoBalance = useAppSelector(state =>
      selectPortfolioCryptoPrecisionBalanceByFilter(state, assetBalanceFilter),
    )

    const explorerHref = useMemo(() => {
      if (!asset) return

      const { assetReference } = fromAssetId(assetId)

      if (isNft(assetId)) {
        const [token] = assetReference.split('/')
        return `${asset.explorer}/token/${token}?a=${asset.id}`
      }

      if (isToken(assetId)) return `${asset?.explorerAddressLink}${assetReference}`

      return asset.explorer
    }, [asset, assetId])

    const handleViewDetailsClick = useCallback(() => {
      navigate(`/assets/${assetId}`)
      onClose?.()
    }, [assetId])

    const handleShowClick = useCallback(() => {
      appDispatch(preferences.actions.toggleSpamMarkedAssetId(assetId))
    }, [assetId])

    if (!asset) return null

    return (
      <Flex align='center' justify='space-between' p={4} borderRadius='md' sx={hoverStylesSx}>
        <Flex align='center' gap={3} flex={1}>
          <AssetIcon assetId={assetId} size='sm' />
          <Box>
            <RawText fontSize='md' fontWeight='medium'>
              {asset.name}
            </RawText>
            <Text fontSize='sm' color='text.subtle'>
              {asset.symbol}
            </Text>
          </Box>
        </Flex>
        <Flex align='center' gap={3}>
          <Stack spacing={0} fontWeight='medium' textAlign='right'>
            <Amount.Crypto
              fontWeight='semibold'
              lineHeight='shorter'
              height='20px'
              value={cryptoBalance}
              symbol={asset.symbol}
              truncateLargeNumbers={true}
            />
          </Stack>
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label={translate('common.moreOptions')}
              icon={dotsIcon}
              variant='ghost'
              size='sm'
              isRound
            />
            <MenuList>
              <MenuItem icon={fileTextIcon} onClick={handleViewDetailsClick}>
                {translate('common.viewAssetDetails')}
              </MenuItem>
              {explorerHref && (
                <MenuItem
                  icon={externalLinkIcon}
                  as='a'
                  href={explorerHref}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {translate('common.viewOnExplorer')}
                </MenuItem>
              )}
              <MenuItem icon={eyeIcon} onClick={handleShowClick} color='red.500'>
                {translate('assets.showAsset')}
              </MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </Flex>
    )
  }

  if (hiddenAssets.length === 0) {
    return (
      <VStack spacing={4} py={8} textAlign='center'>
        <Text fontSize='lg' fontWeight='medium' color='text.subtle'>
          {translate('manageHiddenAssets.empty.title')}
        </Text>
        <Text fontSize='sm' color='text.subtle' maxW='md'>
          {translate('manageHiddenAssets.empty.body')}
        </Text>
      </VStack>
    )
  }

  return (
    <Stack spacing={1}>
      {hiddenAssets.map(asset => (
        <AssetRow key={asset.assetId} assetId={asset.assetId} />
      ))}
    </Stack>
  )
}
