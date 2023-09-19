import { Avatar, Grid, GridItem } from '@chakra-ui/react'
import type { SignClientTypes } from '@walletconnect/types'
import type { FC } from 'react'
import { FoxIcon } from 'components/Icons/FoxIcon'

interface IProps {
  // Override the icons type, as it's incorrect - "icons" can indeed be undefined in the wild.
  metadata: Omit<SignClientTypes.Metadata, 'icons'> & { icons: string[] | undefined }
}

export const DAppInfo: FC<IProps> = ({ metadata }) => {
  const { icons, name, url, description } = metadata
  const icon = icons && icons.length > 0 ? icons[0] : undefined

  return (
    <Grid templateRows='repeat(2, 1fr)' templateColumns='repeat(5, 1fr)' gap={4}>
      <GridItem rowSpan={3} colSpan={1}>
        {icon && <Avatar src={icon} icon={<FoxIcon boxSize='16px' />} />}
      </GridItem>
      <GridItem colSpan={4}>{name}</GridItem>
      <GridItem colSpan={4}>{url}</GridItem>
      <GridItem colSpan={4}>{description}</GridItem>
    </Grid>
  )
}
