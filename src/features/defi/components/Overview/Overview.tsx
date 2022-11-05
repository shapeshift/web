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
import type { Asset } from '@keepkey/asset-service'
import type { AccountId } from '@keepkey/caip'
import type { PropsWithChildren } from 'react'
import { useMemo } from 'react'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { Amount } from 'components/Amount/Amount'
import type { AssetDescriptionTeaserProps } from 'components/AssetDescriptionTeaser'
import { AssetDescriptionTeaser } from 'components/AssetDescriptionTeaser'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'
import type { Nullable } from 'types/common'

import type { DefiActionButtonProps } from '../DefiActionButtons'
import { DefiActionButtons } from '../DefiActionButtons'
import { PairIcons } from '../PairIcons/PairIcons'

export type AssetWithBalance = {
  cryptoBalance: string
  allocationPercentage?: string
  icons?: string[]
} & Asset

type OverviewProps = {
  accountId?: Nullable<AccountId>
  onAccountIdChange?: (accountId: AccountId) => void
  underlyingAssets: AssetWithBalance[]
  rewardAssets?: AssetWithBalance[]
  name: string
  description?: AssetDescriptionTeaserProps
  asset: Asset
  opportunityFiatBalance: string
  provider: string
  tvl?: string
  apy?: string
  icons?: string[]
  expired?: boolean
} & DefiActionButtonProps &
  PropsWithChildren

export const Overview: React.FC<OverviewProps> = ({
  accountId,
  onAccountIdChange,
  underlyingAssets,
  rewardAssets,
  asset,
  name,
  opportunityFiatBalance,
  provider,
  tvl,
  apy,
  icons,
  description,
  menu,
  children,
  expired,
}) => {
  const renderUnderlyingAssets = useMemo(() => {
    return underlyingAssets.map(asset => {
      return (
        <Tag variant='xs-subtle' columnGap={2} key={asset.symbol}>
          {asset.icons ? (
            <PairIcons icons={asset.icons} iconSize='2xs' bg='transparent' />
          ) : (
            <AssetIcon src={asset.icon} size='2xs' />
          )}
          <Amount.Crypto fontSize='sm' value={asset.cryptoBalance} symbol={asset.symbol} />
          {asset.allocationPercentage && (
            <Amount.Percent color='gray.500' value={asset.allocationPercentage} />
          )}
        </Tag>
      )
    })
  }, [underlyingAssets])

  const renderRewardAssets = useMemo(() => {
    if (!rewardAssets) return null
    return rewardAssets.map((asset, index) => (
      <Tag variant='xs-subtle' columnGap={2} key={`${asset.assetId}_${index}`}>
        <AssetIcon src={asset.icon} size='2xs' />
        <Amount.Crypto fontSize='sm' value={asset.cryptoBalance} symbol={asset.symbol} />
      </Tag>
    ))
  }, [rewardAssets])

  return (
    <Flex
      width='full'
      minWidth={{ base: '100%', md: '500px' }}
      maxWidth={{ base: 'full', md: '500px' }}
      flexDir='column'
    >
      <ModalHeader py={2} display='flex' justifyContent='space-between' alignItems='center'>
        <Text fontSize='md' translation='defi.overview' />
        <ModalCloseButton position='static' />
      </ModalHeader>
      <Stack spacing={0} divider={<Divider />}>
        <Stack spacing={0}>
          <Stack p={8} spacing={6}>
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
              <Stack direction='row' alignItems='center' spacing={2}>
                {icons ? (
                  <PairIcons icons={icons} iconBoxSize='6' h='46px' p={1} borderRadius={8} />
                ) : (
                  <AssetIcon src={asset.icon} size='md' />
                )}
                <Stack spacing={0}>
                  <RawText fontSize='lg' lineHeight='shorter'>
                    {name}
                  </RawText>
                  {onAccountIdChange ? (
                    <AccountDropdown
                      {...(accountId ? { defaultAccountId: accountId } : {})}
                      assetId={asset.assetId}
                      onChange={onAccountIdChange}
                      buttonProps={{ height: 5, variant: 'solid' }}
                    />
                  ) : (
                    <RawText color='gray.500' fontSize='sm' lineHeight='shorter'>
                      {provider}
                    </RawText>
                  )}
                </Stack>
              </Stack>
              <Amount.Fiat fontSize='xl' value={opportunityFiatBalance} />
            </Stack>
            <DefiActionButtons menu={menu} />
          </Stack>
          <Flex px={8} pb={8} columnGap={6}>
            <Stack flex={1} spacing={4}>
              <Text fontWeight='medium' translation='defi.modals.overview.underlyingTokens' />
              <Flex flexDir='row' columnGap={2} rowGap={2} flexWrap='wrap'>
                {renderUnderlyingAssets}
              </Flex>
            </Stack>
            {rewardAssets && (
              <Stack flex={1} spacing={4}>
                <Text fontWeight='medium' translation='defi.modals.overview.availableRewards' />
                <Flex flexDir='row' columnGap={2} rowGap={2} flexWrap='wrap'>
                  {renderRewardAssets}
                </Flex>
              </Stack>
            )}
          </Flex>
        </Stack>
        {children}
        {(description || tvl || apy || expired) && (
          <>
            <Stack p={8} spacing={4}>
              <Stack spacing={0}>
                <Text fontSize='lg' fontWeight='medium' translation='defi.modals.overview.about' />
                {description && <AssetDescriptionTeaser {...description} />}
              </Stack>
              {(tvl || apy || expired) && (
                <StatGroup>
                  {tvl && (
                    <Stat fontWeight='medium'>
                      <Amount.Fiat value={tvl} fontSize='lg' />
                      <StatLabel>TVL</StatLabel>
                    </Stat>
                  )}

                  {apy && (
                    <Stat fontWeight='medium'>
                      <Amount.Percent autoColor value={apy} fontSize='lg' />
                      <StatLabel>APY</StatLabel>
                    </Stat>
                  )}

                  {expired && (
                    <Stat fontWeight='medium'>
                      <Tag colorScheme='yellow'>
                        <Text translation='defi.ended' />
                      </Tag>
                    </Stat>
                  )}
                </StatGroup>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </Flex>
  )
}
