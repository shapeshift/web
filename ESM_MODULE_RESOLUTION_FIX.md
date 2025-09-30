# ESM Module Resolution Issue in ShapeShift Workspace Packages

## The Problem

The ShapeShift workspace packages generate ESM builds that are incompatible with strict Node.js ESM module resolution:

**Affected Packages:**
- `@shapeshiftoss/caip`
- `@shapeshiftoss/types`
- `@shapeshiftoss/utils`

**Issue:** The compiled ESM output in `dist/esm/` contains relative imports without `.js` extensions:

```javascript
// Current output (broken in strict ESM):
import { fromChainId, toChainId } from '../chainId/chainId';
export * from './accountId/accountId';

// Required for Node.js ESM:
import { fromChainId, toChainId } from '../chainId/chainId.js';
export * from './accountId/accountId.js';
```

## Why This Matters

1. **Node.js ESM Spec Compliance**: The ES Module specification requires explicit file extensions for relative imports. Node.js enforces this in ESM mode.

2. **Production Failures**: When bundlers (like Mastra's bundler) process these packages and output strict ESM code, the resulting application crashes at runtime:
   ```
   Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/node_modules/@shapeshiftoss/types/dist/account'
   ```

3. **Ecosystem Impact**: Any downstream project consuming these packages as ESM dependencies (not just bundled) will encounter module resolution failures.

4. **Modern Tooling**: Tools like Bun, Deno, and modern bundlers increasingly expect spec-compliant ESM with explicit extensions.

## Root Cause

TypeScript's compiler **does not automatically add `.js` extensions** when emitting ESM code. The current configuration:

```json
// packages/caip/tsconfig.esm.json
{
  "compilerOptions": {
    "module": "esnext",  // Preserves imports exactly as written
    "outDir": "dist/esm"
  }
}
```

This outputs imports exactly as they appear in the TypeScript source code. Since TypeScript allows omitting extensions in imports, the compiled output also lacks them.

## Recommended Solutions

### Option A: Post-Build Script with `tsc-esm-fix` (Recommended)

**Why:** Minimal source code changes, automated, widely used solution.

1. Install the tool:
   ```bash
   yarn add -D tsc-esm-fix
   ```

2. Update `packages/caip/package.json` (and similar for types/utils):
   ```json
   {
     "scripts": {
       "build": "yarn clean && yarn run -T tsc --build && yarn postbuild:esm && yarn postbuild:cjs",
       "postbuild:esm": "tsc-esm-fix --target=dist/esm --ext=.js",
       "postbuild:cjs": "echo '{\"type\": \"commonjs\"}' > dist/cjs/package.json"
     }
   }
   ```

3. The tool automatically rewrites all relative imports to include `.js` extensions.

### Option B: Manual Source Code Updates

**Why:** Explicit, no additional dependencies, TypeScript natively supports this.

1. Update all TypeScript imports to include `.js` extensions:
   ```typescript
   // Before:
   import { fromChainId } from '../chainId/chainId'

   // After:
   import { fromChainId } from '../chainId/chainId.js'
   ```

2. TypeScript will preserve these extensions in the output.

**Pros:** No build-time dependencies, explicit intent.
**Cons:** Large codebase changes, requires updating all relative imports.

### Option C: Switch to `tsup` or `esbuild`

**Why:** Modern bundlers handle this automatically, faster builds, better DX.

1. Install tsup:
   ```bash
   yarn add -D tsup
   ```

2. Replace `packages/caip/package.json` build config:
   ```json
   {
     "scripts": {
       "build": "tsup src/index.ts --format esm,cjs --dts --clean"
     }
   }
   ```

3. Create `packages/caip/tsup.config.ts`:
   ```typescript
   import { defineConfig } from 'tsup'

   export default defineConfig({
     entry: ['src/index.ts'],
     format: ['esm', 'cjs'],
     dts: true,
     clean: true,
     splitting: false,
     sourcemap: true,
   })
   ```

**Pros:** Modern tooling, handles extensions automatically, faster builds.
**Cons:** Changes build system, requires migration effort.

## Testing the Fix

After implementing any solution, verify the output:

```bash
# Build the package
cd packages/caip
yarn build

# Check that ESM imports have .js extensions
grep -r "from '\\.\\./.*'" dist/esm/ | head -20
grep -r "export \* from '\\.\\./.*'" dist/esm/ | head -20

# Should see .js extensions:
# dist/esm/index.js:export * from './chainId/chainId.js';
# dist/esm/accountId/accountId.js:import { fromChainId } from '../chainId/chainId.js';
```

## Impact Assessment

**Current State:**
- ✅ Works: Browser bundlers (Webpack, Vite) - they resolve extensionless imports
- ✅ Works: CommonJS consumers - CJS doesn't require extensions
- ❌ Broken: Node.js ESM runtime
- ❌ Broken: Bundlers that output strict ESM (like Mastra)
- ❌ Broken: Deno, Bun (when in strict mode)

**After Fix:**
- ✅ Works: All of the above
- ✅ Future-proof: Compliant with ESM specification
- ✅ Better DX: Clear, explicit imports

## Rollout Plan

1. **Test in One Package First**: Start with `@shapeshiftoss/caip` (smallest, fewest deps)
2. **Verify Consumers**: Test that existing consumers still work (backward compatible)
3. **Roll Out to All Packages**: Apply fix to `types` and `utils`
4. **Publish New Versions**: Bump patch versions and publish
5. **Update Downstream**: Update consuming projects to use new versions

## Additional Resources

- [Node.js ESM Modules Documentation](https://nodejs.org/api/esm.html#mandatory-file-extensions)
- [TypeScript ESM Support](https://www.typescriptlang.org/docs/handbook/esm-node.html)
- [tsc-esm-fix](https://github.com/antfu/tsc-esm-fix)
- [tsup Documentation](https://tsup.egoist.dev/)