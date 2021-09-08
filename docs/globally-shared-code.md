# Globally Shared Code

We should always be writing our code so it is easy to be moved and shared. As a general rule of thumb is to build the components, hooks and helpers local to the code that is using it. Once it is needed in multiple locations pull it out into the proper shared folder.

## Aliased file paths

We use aliasing for our file paths so that we can easily nest components and not have to worry about traversing our files with the correct `../../../` The aliases are implemented for any of the folders in the `src` folder.

```
import { MyCustomHook } from 'hooks/MyCustomHook'
```

## Components

We want to use [Component Driven User Interface](https://www.componentdriven.org/) strategies to make sure we are creating ui that is reusable and maintainable.

## Every component needs a story

We use [Storybook](https://storybook.js.org/docs/react/get-started/introduction) for component documentation.

Anytime you create a reusable component you should let everyone know how it works and what it looks like when it is in that state. For example if you had a component called MyClickable that had 2 different states. You would want to create a storybook story for that component showing both states.

```tsx
// MyClickable.tsx
const MyClickable = ({ onClick, href, children }) => {
	if (href) {
		return (
			<Link href={href}>{children}</Link>
		)
	}

	return (
		<Button onClick={onClick}>{children}</Button>
	)
}

// MyClickable.stories.tsx
export default {
  title: 'Forms/MyClickable',
  decorators: [
    (Story: any) => (
      <Container mt='40px'>
        <Story />
      </Container>
    )
  ]
}
export const Link = () => <MyClickable href="/home">Link</MyClickable>

export const Button = () => <MyClickable onClick={action('clicked')}>Button</MyClickable>
```