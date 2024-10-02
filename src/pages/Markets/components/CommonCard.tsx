import { Box, Button, Card, CardBody, Flex, Text as CText, Tooltip } from '@chakra-ui/react'
import type { AssetId } from '@shapeshiftoss/caip'
import type { PropsWithChildren } from 'react'
import { useCallback } from 'react'
import { WatchAssetButton } from 'components/AssetHeader/WatchAssetButton'
import type { AssetIconProps } from 'components/AssetIcon'
import { AssetIcon } from 'components/AssetIcon'
import { RawText } from 'components/Text'
import { selectAssetById } from 'state/slices/selectors'
import { useAppSelector } from 'state/store'

type CommonStatProps = {
  label: string | JSX.Element
  value: string | JSX.Element
  align?: 'flex-start' | 'center' | 'flex-end'
}

export const CommonStat: React.FC<CommonStatProps> = ({ label, value, align = 'flex-start' }) => {
  return (
    <Flex direction='column' gap={1} justifyContent={align} alignItems={align}>
      <Box fontSize='lg'>
        {typeof value === 'string' ? <RawText>{value}</RawText> : <>{value}</>}
      </Box>
      <Box fontSize='sm' fontWeight='normal'>
        {typeof label === 'string' ? <RawText color='text.subtle'>{label}</RawText> : <>{label}</>}
      </Box>
    </Flex>
  )
}

type CommonCardProps = {
  title: string
  subtitle: string
  assetId: AssetId
  pairProps?: AssetIconProps['pairProps']
  onClick: (assetId: AssetId) => void
} & PropsWithChildren

export const CommonCard: React.FC<CommonCardProps> = ({
  title,
  subtitle,
  assetId,
  onClick,
  pairProps,
  children,
}) => {
  const asset = useAppSelector(state => selectAssetById(state, assetId))

  const handleClick = useCallback(() => onClick(assetId), [assetId, onClick])

  if (!asset) return null

  return (
    <Card as={Button} height='168px' width='100%' borderRadius='2xl' p={0} onClick={handleClick}>
      <CardBody
        as={Flex}
        flexDirection='column'
        justifyContent='space-between'
        py={6}
        px={6}
        width='100%'
        height='100%'
      >
        <Flex align='center'>
          <AssetIcon assetId={asset.assetId} size='md' mr={2} pairProps={pairProps} />
          <Box textAlign='left' overflow='hidden' width='100%'>
            <Tooltip label={title} placement='top-start'>
              <CText fontWeight='medium' textOverflow='ellipsis' overflow='hidden'>
                {title}
              </CText>
            </Tooltip>
            <CText
              fontSize='sm'
              color='text.subtle'
              textOverflow='ellipsis'
              overflow='hidden'
              fontWeight='normal'
              mt={1}
            >
              {subtitle}
            </CText>
          </Box>
          <WatchAssetButton assetId={assetId} alignSelf='flex-start' />
        </Flex>
        {children && (
          <Flex mt={4} justify='space-between'>
            {children}
          </Flex>
        )}
      </CardBody>
    </Card>
  )
}
