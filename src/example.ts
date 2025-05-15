import { SQSClient } from "@aws-sdk/client-sqs";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSExtendedClient } from "./client";

// Example usage
const sqs = new SQSClient({ region: "us-east-1" });
const s3 = new S3Client({ region: "us-east-1" });

const extendedClient = new SQSExtendedClient(sqs, s3, {
  s3BucketName: "your-s3-bucket",
  messageSizeThreshold: 1024, // 1 KB for demo
  alwaysThroughS3: false,
});

async function exampleSendReceive() {
  // Send a message
  const sendResult = await extendedClient.sendMessage({
    QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/your-queue",
    MessageBody: "Hello, this is a test message that might be large!",
    MessageAttributes: {
      CustomAttr: { DataType: "String", StringValue: "value" }
    }
  });
  console.log("Send result:", sendResult);

  // Receive a message
  const receiveResult = await extendedClient.receiveMessage({
    QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/your-queue",
    MaxNumberOfMessages: 1,
    MessageAttributeNames: ["All"]
  });
  console.log("Receive result:", receiveResult);
}

// Uncomment to run the example
// exampleSendReceive();
