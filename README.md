# sqs-extended-ts  [![npm version](https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white)](https://www.npmjs.com/package/sqs-extended-ts)

Amazon SQS Extended Client Library for TypeScript. This library allows you to send and receive large messages via SQS by storing payloads in S3 when they exceed a threshold.

## Features

- Transparently offloads large SQS messages to S3
- Compatible with AWS SDK v3 for JavaScript/TypeScript
- Can be used as a drop-in replacement for `SQSClient` to use with packages like `sqs-consumer`

## Usage

```ts
const extendedClient = new SQSExtendedClient(sqs, s3, {
  s3BucketName: "your-s3-bucket",
  messageSizeThreshold: 1024, // 1Kb for demo
  alwaysThroughS3: false,
});

const sendResult = await extendedClient.sendMessage({
  QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/your-queue",
  MessageBody: "Hello, this is a test message that might be large!",
  MessageAttributes: {
    CustomAttr: { DataType: "String", StringValue: "value" },
  },
});
console.log("Send result:", sendResult);

// Receive a message
const receiveResult = await extendedClient.receiveMessage({
  QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/your-queue",
  MaxNumberOfMessages: 1,
  MessageAttributeNames: ["All"],
});
console.log("Receive result:", receiveResult);
```

## Disclaimer

This is a direct typescript port of [amazon-sqs-python-extended-client-lib](https://github.com/awslabs/amazon-sqs-python-extended-client-lib) made using ChatGPT with some minor changes. So use with CAUTION!
