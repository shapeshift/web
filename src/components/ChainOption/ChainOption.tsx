import { forwardRef, MenuItemOption, Stack } from '@chakra-ui/react'
import type { ChainId } from '@shapeshiftoss/caip'
import { useMemo } from 'react'
import { Amount } from 'components/Amount/Amount'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import type { Asset } from 'lib/asset-service'
import { selectPortfolioTotalBalanceByChainIdIncludeStaking } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ChainOptionProps = {
  chainId?: ChainId
  asset?: Asset
  showFiatBalance?: boolean
}

export const ChainOption = forwardRef<ChainOptionProps, 'button'>(
  ({ chainId, asset, showFiatBalance }, ref) => {
    const filter = useMemo(() => ({ chainId }), [chainId])
    const chainFiatBalance = useAppSelector(s =>
      selectPortfolioTotalBalanceByChainIdIncludeStaking(s, filter),
    )
    return (
      <MenuItemOption ref={ref} key={chainId} iconSpacing={0} value={chainId}>
        <Stack direction='row' spacing={0} ml={0}>
          <AssetIcon size='xs' assetId={asset?.assetId} showNetworkIcon mr={3} />
          <RawText fontWeight='bold'>{asset?.networkName ?? asset?.name}</RawText>
          {showFiatBalance && chainFiatBalance && <Amount.Fiat value={chainFiatBalance} />}
        </Stack>
      </MenuItemOption>
    )
  },
)
