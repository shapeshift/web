import { Card } from 'components/Card/Card'
import { LeftSidebarChildProps } from 'components/Layout/LeftSidebar'
import { NestedMenu } from 'components/NestedMenu/NestedMenu'
import { Text } from 'components/Text'

export const DefiSidebar = ({ route }: LeftSidebarChildProps) => {
  return (
    <Card variant='unstyled'>
      <Card.Header>
        <Card.Heading fontSize='lg'>
          <Text translation='defi.defi' />
        </Card.Heading>
        <Text color='gray.500' translation='defi.defiBody' />
      </Card.Header>
      <Card.Body pt={0} px={2}>
        <NestedMenu route={route} />
      </Card.Body>
    </Card>
  )
}
