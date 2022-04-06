import { makeBaseNPMConfig, makeNPMConfigVariants } from '../../rollup.config.js';

export default makeNPMConfigVariants(makeBaseNPMConfig({ watchPackages: ['react', 'tracing'] }));
