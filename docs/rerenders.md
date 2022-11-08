# Rerenders

We use `why-did-you-render` to detect components re-renders.

To use it, add the following after your component declaration:

```typescript
ComponentName.whyDidYouRender = true
```

This will detect re-renders despite values being equal.

For advanced usage, see [why-did-you-render](https://github.com/welldone-software/why-did-you-render) docs.
