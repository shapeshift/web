# Globally Shared Code

We should always be writing our code so it is easy to be moved and shared. As a general rule of thumb is to build the components, hooks and helpers local to the code that is using it. Once it is needed in multiple locations pull it out into the proper shared folder.

## Aliased file paths

We use aliasing for our file paths so that we can easily nest components and not have to worry about traversing our files with the correct `../../../` The aliases are implemented for any of the folders in the `src` folder.

```
import { MyCustomHook } from 'hooks/MyCustomHook'
```

## Components

We want to use [Component Driven User Interface](https://www.componentdriven.org/) strategies to make sure we are creating ui that is reusable and maintainable.
