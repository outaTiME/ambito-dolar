import * as sst from '@serverless-stack/resources';
import { Template } from 'aws-cdk-lib/assertions';

import Stack from '../stacks/Stack';

test('Test Stack', () => {
  const app = new sst.App();
  // WHEN
  const stack = new Stack(app, 'test-stack');
  // THEN
  const template = Template.fromStack(stack);
  template.resourceCountIs('AWS::Lambda::Function', 14);
});
