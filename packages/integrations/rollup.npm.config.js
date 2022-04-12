import { makeBaseNPMConfig, makeNPMConfigVariants } from '../../rollup.config.js';

export default makeNPMConfigVariants(
  makeBaseNPMConfig({ watchPackages: ['utils'] }),
  true, // `hasBundles`, which determines the build directory structure
);
