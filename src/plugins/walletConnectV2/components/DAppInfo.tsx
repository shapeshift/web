import { Avatar, Grid, GridItem } from '@chakra-ui/react'
import type { SignClientTypes } from '@walletconnect/types'
import type { FC } from 'react'
import { FoxIcon } from 'components/Icons/FoxIcon'

interface IProps {
  metadata: SignClientTypes.Metadata
}

export const DAppInfo: FC<IProps> = ({ metadata }) => {
  const { icons, name, url, description } = metadata

  return (
    <Grid templateRows='repeat(2, 1fr)' templateColumns='repeat(5, 1fr)' gap={4}>
      <GridItem rowSpan={3} colSpan={1}>
        {icons.map(icon => (
          <Avatar src={icon} icon={<FoxIcon boxSize='16px' />} />
        ))}
      </GridItem>
      <GridItem colSpan={4}>{name}</GridItem>
      <GridItem colSpan={4}>{url}</GridItem>
      <GridItem colSpan={4}>{description}</GridItem>
    </Grid>
  )
}
