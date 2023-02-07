import { Flex, FormLabel, useColorModeValue } from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { AssetIcon } from 'components/AssetIcon'
import { Card } from 'components/Card/Card'
import { RawText } from 'components/Text'
import { selectAssetById, selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type TradeAssetSelectProps = {
  assetId?: AssetId
  onAccountIdChange?: AccountDropdownProps['onChange']
  accountId?: AccountId | undefined
  accountSelectionDisabled?: boolean
  onAssetClick?: () => void
  label: string
}

export const TradeAssetSelect: React.FC<TradeAssetSelectProps> = ({
  onAccountIdChange: handleAccountIdChange,
  accountId,
  accountSelectionDisabled,
  onAssetClick,
  assetId,
  label,
}) => {
  const focusBg = useColorModeValue('gray.100', 'gray.750')
  const hoverBg = useColorModeValue('gray.50', 'gray.900')
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, asset?.chainId ?? ''))
  const handleChange = () => {
    return null
  }
  return (
    <Card bg='gray.850' flex={1}>
      <Card.Body
        display='flex'
        gap={1}
        flexDir='column'
        _hover={{ bg: hoverBg }}
        _active={{ bg: focusBg }}
        cursor='pointer'
        borderTopRadius='xl'
        py={2}
        px={4}
        onClick={onAssetClick}
      >
        <FormLabel mb={0} fontSize='sm'>
          {label}
        </FormLabel>
        <Flex gap={2} alignItems='center'>
          <AssetIcon assetId={assetId} size='sm' />
          <Flex flexDir='column' fontWeight='medium'>
            <RawText lineHeight='shorter'>{asset?.symbol}</RawText>
            <RawText fontSize='xs' color='gray.500' lineHeight='shorter'>
              on {feeAsset?.name}
            </RawText>
          </Flex>
        </Flex>
      </Card.Body>
      {handleAccountIdChange && assetId && (
        <Card.Footer p={0} borderTopWidth={1} borderColor='gray.750'>
          <AccountDropdown
            {...(accountId ? { defaultAccountId: accountId } : {})}
            assetId={assetId}
            onChange={handleChange}
            buttonProps={{ width: 'full', borderTopRadius: 0, px: 4, fontSize: 'xs' }}
            showLabel={false}
            boxProps={{ m: 0, p: 0 }}
            disabled={accountSelectionDisabled}
            autoSelectHighestBalance
          />
        </Card.Footer>
      )}
    </Card>
  )
}
