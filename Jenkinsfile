#!groovy
@Library('jenkins-jobs@old-pipeline-deploy') _

serverlessPipeline(
  defaultEnvironment: 'production',
  packageManager: 'yarn',
  assumeRole: 'arn:aws:iam::699385956789:role/cru-udp-pipeline-DeployRole',
  ecsConfigBranch: 'cru-udp-pipeline-aws',
)
