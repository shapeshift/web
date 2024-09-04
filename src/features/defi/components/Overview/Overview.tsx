import {
  Divider,
  Flex,
  ModalCloseButton,
  ModalHeader,
  Stack,
  Stat,
  StatGroup,
  StatLabel,
  Tag,
} from '@chakra-ui/react'
import { type AccountId, fromAccountId } from '@shapeshiftoss/caip'
import type { Asset } from '@shapeshiftoss/types'
import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import type { AssetDescriptionTeaserProps } from 'components/AssetDescriptionTeaser'
import { AssetDescriptionTeaser } from 'components/AssetDescriptionTeaser'
import { AssetIcon } from 'components/AssetIcon'
import { InlineCopyButton } from 'components/InlineCopyButton'
import { RawText, Text } from 'components/Text'
import { isUtxoAccountId } from 'lib/utils/utxo'

import type { DefiActionButtonProps } from '../DefiActionButtons'
import { DefiActionButtons } from '../DefiActionButtons'
import { PairIcons } from '../PairIcons/PairIcons'
import { UnderlyingAssetsMenu } from './UnderlyingAssetsMenu'
import { UnderlyingAssetsTags } from './UnderlyingAssetsTags'

export type AssetWithBalance = {
  cryptoBalancePrecision: string
  allocationPercentage?: string
  icons?: string[]
} & Asset

type OverviewProps = {
  accountId?: AccountId | undefined
  onAccountIdChange?: (accountId: AccountId) => void
  // The LP asset this opportunity represents
  lpAsset?: AssetWithBalance
  // The assets underlying the LP one
  underlyingAssetsCryptoPrecision: AssetWithBalance[]
  rewardAssetsCryptoPrecision?: AssetWithBalance[]
  name: string
  description?: AssetDescriptionTeaserProps
  descriptionRight?: JSX.Element
  asset: Asset
  opportunityFiatBalance: string
  provider: string
  tvl?: string
  apy?: string
  icons?: string[]
  expired?: boolean
  version?: string
  postChildren?: React.ReactNode
} & DefiActionButtonProps &
  PropsWithChildren

const divider = <Divider />
const flexMinWidth = { base: '100%', md: '500px' }
const flexMaxWidth = { base: 'full', md: '500px' }
const accountDropdownButtonProps = {
  variant: 'unstyled',
  width: 'full',
  height: 'auto',
  display: 'flex',
}
const accountDropdownBoxProps = { px: 0, my: 0, width: 'full' }

export const Overview: React.FC<OverviewProps> = ({
  accountId,
  onAccountIdChange,
  lpAsset,
  underlyingAssetsCryptoPrecision,
  rewardAssetsCryptoPrecision,
  asset,
  name,
  opportunityFiatBalance,
  provider,
  tvl,
  apy,
  icons,
  description,
  descriptionRight,
  menu,
  children,
  expired,
  version,
  postChildren,
}) => {
  const renderRewardAssets = useMemo(() => {
    if (!rewardAssetsCryptoPrecision) return null
    return rewardAssetsCryptoPrecision.map((asset, index) => (
      <Tag variant='xs-subtle' columnGap={2} key={`${asset.assetId}_${index}`}>
        <AssetIcon src={asset.icon} size='2xs' />
        <Amount.Crypto fontSize='sm' value={asset.cryptoBalancePrecision} symbol={asset.symbol} />
      </Tag>
    ))
  }, [rewardAssetsCryptoPrecision])

  return (
    <Flex width='full' minWidth={flexMinWidth} maxWidth={flexMaxWidth} flexDir='column'>
      <ModalHeader py={2} display='flex' justifyContent='space-between' alignItems='center'>
        <Text fontSize='md' translation='defi.overview' />
        <ModalCloseButton position='static' />
      </ModalHeader>
      <Stack spacing={0} divider={divider}>
        <Stack spacing={0}>
          <Stack p={8} spacing={6}>
            <Flex flexDir='column' gap={3}>
              {onAccountIdChange && (
                <>
                  <InlineCopyButton
                    isDisabled={!accountId || (accountId && isUtxoAccountId(accountId))}
                    value={accountId ? fromAccountId(accountId).account : ''}
                  >
                    <AccountDropdown
                      {...(accountId ? { defaultAccountId: accountId } : {})}
                      assetId={asset.assetId}
                      onChange={onAccountIdChange}
                      buttonProps={accountDropdownButtonProps}
                      boxProps={accountDropdownBoxProps}
                    />
                  </InlineCopyButton>
                  <Divider />
                </>
              )}

              <Stack direction='row' alignItems='center' justifyContent='space-between'>
                <Stack direction='row' alignItems='center' spacing={2}>
                  {icons ? (
                    <PairIcons icons={icons} iconBoxSize='6' h='46px' p={1} borderRadius={8} />
                  ) : (
                    <AssetIcon assetId={asset.assetId} size='md' />
                  )}
                  <Stack spacing={0}>
                    <RawText fontSize='lg' lineHeight='shorter'>
                      {name}
                    </RawText>
                    <RawText color='text.subtle' fontSize='sm' lineHeight='shorter'>
                      {provider}
                    </RawText>
                  </Stack>
                </Stack>
                <Amount.Fiat fontSize='xl' value={opportunityFiatBalance} />
              </Stack>
            </Flex>
            <DefiActionButtons menu={menu} />
          </Stack>
          <Flex px={8} pb={8} gap={6} flexWrap='wrap'>
            <Stack flex={1} spacing={4}>
              <Text fontWeight='medium' translation='defi.modals.overview.underlyingTokens' />
              <Flex flexDir='row' columnGap={2} rowGap={2} flexWrap='wrap'>
                {lpAsset ? (
                  <UnderlyingAssetsMenu
                    lpAsset={lpAsset}
                    underlyingAssets={underlyingAssetsCryptoPrecision}
                  />
                ) : (
                  <UnderlyingAssetsTags
                    underlyingAssets={underlyingAssetsCryptoPrecision}
                    showPercentage
                  />
                )}
              </Flex>
            </Stack>
            {rewardAssetsCryptoPrecision && (
              <Stack flex={1} spacing={4}>
                <Text
                  fontWeight='medium'
                  whiteSpace='nowrap'
                  translation='defi.modals.overview.availableRewards'
                />
                <Flex flexDir='row' columnGap={2} rowGap={2} flexWrap='wrap'>
                  {renderRewardAssets}
                </Flex>
              </Stack>
            )}
          </Flex>
        </Stack>
        {children}
        {(description || tvl || apy || expired || postChildren) && (
          <>
            <Stack p={8} spacing={4}>
              <Stack spacing={0}>
                <Text fontSize='lg' fontWeight='medium' translation='defi.modals.overview.about' />
                <Flex>
                  {description && <AssetDescriptionTeaser {...description} />}
                  {descriptionRight}
                </Flex>
              </Stack>
              {(tvl || apy || expired) && (
                <StatGroup>
                  {tvl && (
                    <Stat fontWeight='medium'>
                      <Amount.Fiat value={tvl} fontSize='lg' />
                      <StatLabel>
                        <Text translation='defi.tvl' />
                      </StatLabel>
                    </Stat>
                  )}

                  {apy && (
                    <Stat fontWeight='medium'>
                      <Amount.Percent autoColor value={apy} fontSize='lg' />
                      <StatLabel>
                        <Text translation='defi.apy' />
                      </StatLabel>
                    </Stat>
                  )}

                  {expired && (
                    <Stat fontWeight='medium'>
                      <Tag colorScheme='yellow'>
                        <Text translation='defi.ended' />
                      </Tag>
                    </Stat>
                  )}
                  {version && (
                    <Stat fontWeight='normal'>
                      <RawText>{version}</RawText>
                      <StatLabel>
                        <Text translation='defi.version' />
                      </StatLabel>
                    </Stat>
                  )}
                </StatGroup>
              )}
              {postChildren}
            </Stack>
          </>
        )}
      </Stack>
    </Flex>
  )
}
