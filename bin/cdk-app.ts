#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AuthServiceStack, ImportServiceStack, MyLambdaProjectStack } from '../lib/cdk-app-stack';

const app = new cdk.App();
new MyLambdaProjectStack(app, 'MyLambdaProjectStack', {
  env: { account: '891377365177', region: 'eu-west-1' },
});

new ImportServiceStack(app, 'ImportServiceStack', {
  env: { account: '891377365177', region: 'eu-west-1' },
});

new AuthServiceStack(app, 'AuthServiceStack', {
  env: { account: '891377365177', region: 'eu-west-1' },
});