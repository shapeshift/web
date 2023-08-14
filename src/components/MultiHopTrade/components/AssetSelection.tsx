import {
  Card,
  CardBody,
  CardFooter,
  Flex,
  FormLabel,
  Skeleton,
  SkeletonCircle,
  Stack,
  useColorModeValue,
} from '@chakra-ui/react'
import type { AccountId, AssetId } from '@shapeshiftoss/caip'
import { memo, useMemo } from 'react'
import type { AccountDropdownProps } from 'components/AccountDropdown/AccountDropdown'
import { AccountDropdown } from 'components/AccountDropdown/AccountDropdown'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { selectAssetById, selectFeeAssetByChainId } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

const TradeAssetAwaitingAsset = () => {
  const bgColor = useColorModeValue('white', 'gray.850')
  return (
    <Stack bgColor={bgColor} py={2} px={4} borderRadius='xl' spacing={0} flex={1}>
      <Stack direction='row' justifyContent='space-between' alignItems='center'>
        <Stack direction='row' alignItems='center'>
          <SkeletonCircle height='32px' />
          <Skeleton height='21px' width='50px' />
        </Stack>
      </Stack>
    </Stack>
  )
}

type TradeAssetSelectProps = {
  assetId?: AssetId
  onAccountIdChange: AccountDropdownProps['onChange']
  accountId?: AccountId | undefined
  accountSelectionDisabled?: boolean
  onAssetClick?: () => void
  label: string
}

const footerPadding = { padding: 0 }
const buttonProps = {
  width: 'full',
  borderTopRadius: 0,
  px: 4,
  fontSize: 'xs',
  py: 4,
  height: 'auto',
}
const boxProps = { m: 0, p: 0, flex: 1 }
const borderRadius = { base: 'xl' }

export const TradeAssetSelectWithAsset: React.FC<TradeAssetSelectProps> = ({
  onAccountIdChange: handleAccountIdChange,
  accountId,
  accountSelectionDisabled,
  onAssetClick,
  assetId,
  label,
}) => {
  const hoverBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.50')
  const focusBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const borderColor = useColorModeValue('blackAlpha.100', 'whiteAlpha.100')
  const asset = useAppSelector(state => selectAssetById(state, assetId ?? ''))
  const feeAsset = useAppSelector(state => selectFeeAssetByChainId(state, asset?.chainId ?? ''))
  const networkName = feeAsset?.networkName || feeAsset?.name

  const hoverProps = useMemo(() => ({ bg: hoverBg }), [hoverBg])
  const activeProps = useMemo(() => ({ bg: focusBg }), [focusBg])

  return (
    <Card
      bg={useColorModeValue('white', 'gray.850')}
      flex={1}
      borderColor={borderColor}
      borderRadius={borderRadius}
      width='full'
      overflow='hidden'
    >
      <CardBody
        display='flex'
        gap={1}
        flexDir='column'
        _hover={hoverProps}
        _active={activeProps}
        cursor='pointer'
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
              on {networkName}
            </RawText>
          </Flex>
        </Flex>
      </CardBody>
      {assetId && (
        <CardFooter style={footerPadding} borderTopWidth={1} borderColor={borderColor}>
          <AccountDropdown
            defaultAccountId={accountId}
            assetId={assetId}
            onChange={handleAccountIdChange}
            buttonProps={buttonProps}
            boxProps={boxProps}
            disabled={accountSelectionDisabled}
            autoSelectHighestBalance
          />
        </CardFooter>
      )}
    </Card>
  )
}

export const TradeAssetSelect: React.FC<TradeAssetSelectProps> = memo(
  ({ assetId, accountId, ...restAssetInputProps }) => {
    return assetId ? (
      <TradeAssetSelectWithAsset assetId={assetId} accountId={accountId} {...restAssetInputProps} />
    ) : (
      <TradeAssetAwaitingAsset />
    )
  },
)
