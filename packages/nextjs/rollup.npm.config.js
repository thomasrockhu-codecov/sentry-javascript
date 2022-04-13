import deepMerge from 'deepmerge';

import { makeBaseNPMConfig, makeNPMConfigVariants } from '../../rollup.config.js';

const baseConfig = makeBaseNPMConfig({
  entrypoint: ['src/index.server.ts', 'src/index.client.ts'],
  esModuleInterop: true,
  watchPackages: ['integrations', 'node', 'react', 'tracing'],
});

export default makeNPMConfigVariants(
  deepMerge(baseConfig, {
    // we already exclude anything listed as a dependency in `package.json`, but somewhere we import from a
    // subpackage of nextjs and rollup doesn't automatically make the connection, so we have to exclude it manually
    external: ['next/router'],
  }),
);
