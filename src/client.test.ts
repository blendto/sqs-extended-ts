import { SQSExtendedClient } from "./client";
import { SQSClient, SendMessageCommandInput } from "@aws-sdk/client-sqs";
import { S3Client } from "@aws-sdk/client-s3";

describe("SQSExtendedClient", () => {
  const sqs = new SQSClient({ region: "us-east-1" });
  const s3 = new S3Client({ region: "us-east-1" });
  const bucket = "test-bucket";
  const client = new SQSExtendedClient(sqs, s3, {
    s3BucketName: bucket,
    messageSizeThreshold: 10,
  });

  it("should not offload small messages to S3", async () => {
    const spy = jest.spyOn(s3, "send");
    const params: SendMessageCommandInput = {
      QueueUrl: "queue-url",
      MessageBody: "short",
      MessageAttributes: {},
    };
    await client.sendMessage(params);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should offload large messages to S3", async () => {
    const spy = jest
      .spyOn(s3, "send")
      // @ts-ignore
      .mockResolvedValue({ $metadata: { httpStatusCode: 204 } } as any);
    const params: SendMessageCommandInput = {
      QueueUrl: "queue-url",
      MessageBody:
        "this message is definitely large enough to trigger S3 offload!",
      MessageAttributes: {},
    };
    await client.sendMessage(params);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should throw on empty message body", async () => {
    await expect(
      client.sendMessage({
        QueueUrl: "queue-url",
        MessageBody: "",
        MessageAttributes: {},
      })
    ).rejects.toThrow();
  });

  // Add more tests for receiveMessage, deleteMessage, etc. as needed
});
