import { Button, Link, Stack, useColorModeValue } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import { DefiModalContent } from 'features/defi/components/DefiModal/DefiModalContent'
import { EmptyOverview } from 'features/defi/components/EmptyOverview/EmptyOverview'
import { useTranslate } from 'react-polyglot'
import SaversVaultTop from 'assets/savers-vault-top.png'
import { RawText, Text } from 'components/Text'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type ThorchainSaversEmptyProps = {
  assetId: AssetId
  onClick?: () => void
}

export const ThorchainSaversEmpty = ({ assetId, onClick }: ThorchainSaversEmptyProps) => {
  const translate = useTranslate()
  const asset = useAppSelector(state => selectAssetById(state, assetId))
  const linkColor = useColorModeValue('blue.500', 'blue.200')
  return (
    <DefiModalContent
      backgroundImage={SaversVaultTop}
      backgroundSize='cover'
      backgroundPosition='center -150px'
      backgroundRepeat='no-repeat'
    >
      <EmptyOverview
        assets={[{ icon: asset?.icon ?? '' }]}
        footer={
          <Button width='full' colorScheme='blue' onClick={onClick}>
            <Text translation='defi.modals.saversVaults.understand' />
          </Button>
        }
      >
        <Stack spacing={4} justifyContent='center' mb={4}>
          <Text translation='defi.modals.saversVaults.introducingSaversVaults' />

          <Text
            color='gray.500'
            translation={['defi.modals.saversVaults.description', { asset: asset?.symbol }]}
          />
          <RawText>
            {`${translate('defi.modals.saversVaults.risksBody.1')} `}
            <Link
              color={linkColor}
              isExternal
              href='https://medium.com/thorchain/thorchain-savers-vaults-fc3f086b4057'
            >
              {translate('defi.modals.saversVaults.risksBody.2')}
            </Link>
            {` ${translate('defi.modals.saversVaults.risksBody.3')}`}
          </RawText>
        </Stack>
      </EmptyOverview>
    </DefiModalContent>
  )
}
