import { Card } from 'components/Card/Card'
import { LeftSidebarChildProps } from 'components/Layout/LeftSidebar'
import { NestedMenu } from 'components/NestedMenu/NestedMenu'
import { Text } from 'components/Text'

export const EarnSidebar = ({ route }: LeftSidebarChildProps) => {
  return (
    <Card variant='unstyled'>
      <Card.Header>
        <Card.Heading fontSize='lg'>
          <Text translation='earn.earn' />
        </Card.Heading>
        <Text color='gray.500' translation='earn.earnBody' />
      </Card.Header>
      <Card.Body pt={0} px={2}>
        <NestedMenu route={route} />
      </Card.Body>
    </Card>
  )
}
