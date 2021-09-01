# File structure

Few rules for creating maintainable components in react.

## Function Components

We are sticking with the times and using Function Components.

## Named exports only

We have decided to only export our components using named exports. That way we don't start importing our components with different names.

```
// Bad
export default MySuperCoolComponent = () => ({})
import MySuperCoolComponent from 'MySuperCoolComponent'

// Good
export const MySuperCoolComponent = () => ({})
import { MySuperCoolComponent } from 'MySuperCoolComponent'
```

## Small component files

We should really be striving to have small component files. When files get large and bloated they become harder to maintain, there are more merge conflicts and they are harder to test. Our goal as React developers should be to make our code as reusable as possible. Bloated components never end up be reusable and the reusability potential becomes harder to see because the component is so complex. Here are a few things to help create smaller components.

### File Size

There is no magic number to say how many lines is too much. But if we are writing code and it starts to approach or pass the 150 line mark, we should start asking our selves if it can be broken down into smaller more digestible chunks and/or needs to use some already created shared code to help slim it down.

### Try to only define one component/function per file

Another common thing that makes components bloated is defining multiple functions/components in the same file. Here are a few reasons it is a good idea to separate your functions and components into their own files.

1. You can unit test separately from the rest of the code.
2. If anyone decides that they can reuse that code its a quick and easy move to a shared folder.
3. It can be confusing when you are looking for a component that is exported from a file that does not share the same name. It sounds trivial but it removes just a little bit of friction.

### Use your judgement when splitting out components

You don't need to split out components just to split them out. If you define a component to use within the root component and it is a small couple line component maybe it does not need to be pulled out. But if you start getting components that is large and takes a hand full of props maybe it should be pulled out into it's own file.

### Views should be dumb

Separate the business logic from the view as much as possible. Create hooks, helpers & reducers to utilize this logic from the ui and [test](CONTRIBUTING.md#testing) that code in isolation from it's ui.
