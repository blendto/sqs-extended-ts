"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/ban-ts-comment */
const client_1 = require("./client");
const client_sqs_1 = require("@aws-sdk/client-sqs");
const client_s3_1 = require("@aws-sdk/client-s3");
describe("SQSExtendedClient", () => {
    const sqs = new client_sqs_1.SQSClient({ region: "us-east-1" });
    const s3 = new client_s3_1.S3Client({ region: "us-east-1" });
    const bucket = "test-bucket";
    const client = new client_1.SQSExtendedClient(sqs, s3, {
        s3BucketName: bucket,
        messageSizeThreshold: 10,
    });
    it("should not offload small messages to S3", async () => {
        const spy = jest.spyOn(s3, "send");
        const params = {
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
            // @ts-expect-error
            .mockResolvedValue({ $metadata: { httpStatusCode: 204 } });
        const params = {
            QueueUrl: "queue-url",
            MessageBody: "this message is definitely large enough to trigger S3 offload!",
            MessageAttributes: {},
        };
        await client.sendMessage(params);
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
    it("should throw on empty message body", async () => {
        await expect(client.sendMessage({
            QueueUrl: "queue-url",
            MessageBody: "",
            MessageAttributes: {},
        })).rejects.toThrow();
    });
    // Add more tests for receiveMessage, deleteMessage, etc. as needed
});
