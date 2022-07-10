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
import { Asset } from '@shapeshiftoss/types'
import { Amount } from 'components/Amount/Amount'
import {
  AssetDescriptionTeaser,
  AssetDescriptionTeaserProps,
} from 'components/AssetDescriptionTeaser'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'

import { DefiActionButtonProps, DefiActionButtons } from '../DefiActionButtons'

type AssetWithBalance = {
  balance: string
  allocationPercentage?: string
} & Asset

type OverviewProps = {
  underlyingAssets: AssetWithBalance[]
  rewardAssets?: AssetWithBalance[]
  name: string
  description?: AssetDescriptionTeaserProps
  asset: Asset
  balance: string
  provider: string
  tvl?: string
  apy?: string
} & DefiActionButtonProps

export const Overview: React.FC<OverviewProps> = ({
  underlyingAssets,
  rewardAssets,
  asset,
  name,
  balance,
  provider,
  tvl,
  apy,
  description,
  menu,
  children,
}) => {
  return (
    <Flex
      width='full'
      minWidth={{ base: '100%', md: '500px' }}
      maxWidth={{ base: 'full', md: '500px' }}
      flexDir='column'
    >
      <ModalHeader py={2} display='flex' justifyContent='space-between' alignItems='center'>
        <RawText fontSize='md'>Overview</RawText>
        <ModalCloseButton position='static' />
      </ModalHeader>
      <Stack spacing={0} divider={<Divider />}>
        <Stack spacing={0}>
          <Stack p={8} spacing={6}>
            <Stack direction='row' alignItems='center' justifyContent='space-between'>
              <Stack direction='row' alignItems='center' spacing={2}>
                <AssetIcon src={asset.icon} size='md' />
                <Stack spacing={0}>
                  <RawText fontSize='lg' lineHeight='shorter'>
                    {name}
                  </RawText>
                  <RawText color='gray.500' fontSize='sm' lineHeight='shorter'>
                    {provider}
                  </RawText>
                </Stack>
              </Stack>
              <Amount.Fiat fontSize='xl' value={balance} />
            </Stack>
            <DefiActionButtons menu={menu} />
          </Stack>
          <Flex px={8} pb={8} columnGap={6}>
            <Stack flex={1} spacing={4}>
              <RawText fontWeight='medium'>Underlying Tokens</RawText>
              <Flex flexDir='row' columnGap={2} rowGap={2} flexWrap='wrap'>
                {underlyingAssets.map(asset => {
                  return (
                    <Tag variant='xs-subtle' columnGap={2} size='sm' key={asset.symbol}>
                      <AssetIcon src={asset.icon} size='2xs' />
                      <Amount.Crypto fontSize='sm' value={asset.balance} symbol={asset.symbol} />
                      {asset.allocationPercentage && (
                        <Amount.Percent color='gray.500' value={asset.allocationPercentage} />
                      )}
                    </Tag>
                  )
                })}
              </Flex>
            </Stack>
            {rewardAssets && (
              <Stack flex={1} spacing={4}>
                <RawText fontWeight='medium'>Available Rewards</RawText>
                <Flex flexDir='row' columnGap={2} rowGap={2} flexWrap='wrap'>
                  {rewardAssets.map(asset => (
                    <Tag variant='xs-subtle' columnGap={2} size='sm'>
                      <AssetIcon src={asset.icon} size='2xs' />
                      <Amount.Crypto fontSize='sm' value={asset.balance} symbol={asset.symbol} />
                    </Tag>
                  ))}
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
                <RawText fontSize='lg' fontWeight='medium'>
                  About
                </RawText>
                {description && (
                  <AssetDescriptionTeaser
                    description={description?.description}
                    isLoaded={description?.isLoaded}
                    isTrustedDescription={description?.isTrustedDescription}
                  />
                )}
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
