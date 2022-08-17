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
import { Asset } from '@shapeshiftoss/asset-service'
import { PropsWithChildren, useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import {
  AssetDescriptionTeaser,
  AssetDescriptionTeaserProps,
} from 'components/AssetDescriptionTeaser'
import { AssetIcon } from 'components/AssetIcon'
import { RawText, Text } from 'components/Text'

import { DefiActionButtonProps, DefiActionButtons } from '../DefiActionButtons'
import { PairIcons } from '../PairIcons/PairIcons'

type AssetWithBalance = {
  cryptoBalance: string
  allocationPercentage?: string
  icons?: string[]
} & Asset

type OverviewProps = {
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
} & DefiActionButtonProps &
  PropsWithChildren

export const Overview: React.FC<OverviewProps> = ({
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
}) => {
  const renderUnderlyingAssets = useMemo(() => {
    return underlyingAssets.map(asset => {
      return (
        <Tag variant='xs-subtle' columnGap={2} size='sm' key={asset.symbol}>
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
    return rewardAssets.map(asset => (
      <Tag variant='xs-subtle' columnGap={2} size='sm'>
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
                  <RawText color='gray.500' fontSize='sm' lineHeight='shorter'>
                    {provider}
                  </RawText>
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
        {(description || tvl || apy) && (
          <>
            <Stack p={8} spacing={4}>
              <Stack spacing={0}>
                <Text fontSize='lg' fontWeight='medium' translation='defi.modals.overview.about' />
                {description && <AssetDescriptionTeaser {...description} />}
              </Stack>
              {(tvl || apy) && (
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
                </StatGroup>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </Flex>
  )
}
