import { makeBaseBundleConfig, makeBundleConfigVariants } from '../../rollup.config';

const baseBundleConfig = makeBaseBundleConfig({
  input: 'src/index.bundle.ts',
  isAddOn: false,
  jsVersion: 'es5',
  licenseTitle: '@sentry/vue',
  outputFileBase: 'bundle.vue',
});

export default makeBundleConfigVariants(baseBundleConfig);
