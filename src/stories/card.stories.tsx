import { Container, Stack, Text } from '@chakra-ui/react'
import { Card } from 'components/Card'

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  title: 'Card',
  decorators: [
    (Story: any) => (
      <Container mt='40px'>
        <Story />
      </Container>
    )
  ]
}

export const basic = () => (
  <Card>
    <Card.Header>
      <Card.Heading>Heading</Card.Heading>
    </Card.Header>
    <Card.Body>
      <Text>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam nec fermentum nulla. Etiam
        scelerisque, odio ac vestibulum accumsan, felis sem ullamcorper ante, a finibus turpis velit
        non lorem. Suspendisse volutpat facilisis urna, non posuere nulla venenatis vel. Nam egestas
        mauris nec semper mollis. Aenean dapibus fermentum nunc consequat rutrum. Pellentesque vitae
        tellus velit. Vivamus at urna ac ligula ornare posuere. Suspendisse potenti. Vestibulum
        porttitor, eros ut commodo pulvinar, sapien velit consectetur ligula, sit amet gravida leo
        sem vel nulla. Integer nec vulputate ante. Pellentesque habitant morbi tristique senectus et
        netus et malesuada fames ac turpis egestas.
      </Text>
    </Card.Body>
    <Card.Footer>
      <Text>Card Footer</Text>
    </Card.Footer>
  </Card>
)

export const withVariants = () => (
  <Stack>
    <Card>
      <Card.Header>
        <Card.Heading>Heading</Card.Heading>
      </Card.Header>
      <Card.Body>
        <Text>Default Variant</Text>
      </Card.Body>
    </Card>
    <Card variant='inverted'>
      <Card.Header>
        <Card.Heading>Heading</Card.Heading>
      </Card.Header>
      <Card.Body>
        <Text>Inverted Variant</Text>
      </Card.Body>
    </Card>
  </Stack>
)
