/// <reference path="../.sst/platform/config.d.ts" />

export function applyFunctionDefaults() {
  $transform(sst.aws.Function, (args) => {
    args.logging ??= {
      retention: '1 day',
    };
    args.retries ??= 0;
    args.runtime ??= 'nodejs22.x';
    // skip the sourcemap upload to s3
    args.nodejs = { ...args.nodejs, sourcemap: false };
  });
}
