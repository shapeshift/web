# Folder structure

In order to have consistent, easy to navigate react projects we follow a certain folder structure.

```
src/
  assets/
  components/
  constants/
  context/
  hooks/
  lib/
  pages/
  state/
  types/
```

## Local Folders

We want to be separating business logic, implementation logic and the view for better code organization, readability and easier testing. When doing this we want to make it as easy as possible for people to find the code for the current screen you are on so they know when they could reuse something that has already been created. So we separate our local hooks, helper functions and nested components.

```
// folder structure if additional nested components are needed.

Home/
	hooks/
	helpers/
	components/
	HomeProvider.tsx
	Home.tsx
	Home.test.tsx
```

## Nesting Components

If there are children that are dependencies of a function we should nest them. Create a folder as the name of the exported function and move all dependencies into that folder.

```
MyComponent/
	MyComponent.test.tsx
	MyComponent.tsx

import { MyComponent } from 'MyComponent/MyComponent'
```

Three Layers Deep: We do not want to nest too deeply. A good rule of thumb is only nest three layers deep starting from one of our aliases.

```
pages/
	One/
		Two/
			Three/
				Three.test.tsx
				Three.tsx
			Two.test.tsx
			Two.tsx
		One.test.tsx
		One.tsx
```

In the above example you will see that the One component has a child component that is only rendered with in the One component. You can also see that the Two component has a child called Three that is only rendered inside of the Two so the Three is nested within the Two's component folder.

Having the components nested in this way allows us to easily move or delete code knowing that all of its dependencies are packaged together. For example...

- If we decide that the Two component needs to be a globally shared component. We can easily move that component to the correct shared folder and we know that its child Three is going to go with it.
- Similarly if we decided that the One component did not need a Two component anymore we could delete the Two component and we would not accidentally leave the Three component lying around, taking up space and not being used for anything.
