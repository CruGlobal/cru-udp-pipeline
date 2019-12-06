# cru-udp-pipeline

Serverless framework project that is deployed to the snowplow sub-account. It reads from the snowplow managed Kinesis stream and writes records to an SQS queue in the primary cruds account. This exists because Kinesis doesn't allow cross-account communication.
