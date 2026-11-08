/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'ambito-dolar',
      home: 'aws',
      region: 'us-east-1',
      removal: input?.stage === 'prod' ? 'retain' : 'remove',
      state: {
        compress: true,
        retention: 2,
      },
    };
  },
  async run() {
    const { applyFunctionDefaults } = await import('./infra/defaults');
    const { createContext } = await import('./infra/context');
    const { createResources } = await import('./infra/resources');
    const { createApi } = await import('./infra/api');
    const { createSites } = await import('./infra/sites');
    const { createCrons } = await import('./infra/crons');
    const { createSubscribers } = await import('./infra/subscribers');

    applyFunctionDefaults();
    const ctx = createContext({ app: $app, dev: $dev });

    const resources = createResources(ctx);
    const api = createApi(ctx, resources);
    createSites(ctx, api);
    createCrons(ctx, resources);
    createSubscribers(ctx, resources);
  },
});
