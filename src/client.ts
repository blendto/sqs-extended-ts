/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  SQSClient,
  SendMessageCommand,
  SendMessageCommandInput,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
  PurgeQueueCommand,
  SendMessageBatchCommand,
  DeleteMessageBatchCommand,
  ChangeMessageVisibilityBatchCommand,
  ReceiveMessageRequest,
  Message,
  SendMessageCommandOutput,
  DeleteMessageRequest,
  DeleteMessageCommandOutput,
  SendMessageRequest,
  ReceiveMessageCommandOutput,
  SendMessageBatchRequest,
  SendMessageBatchCommandOutput,
  DeleteMessageBatchRequest,
  DeleteMessageBatchCommandOutput,
  ChangeMessageVisibilityRequest,
  ChangeMessageVisibilityCommandOutput,
  ChangeMessageVisibilityBatchRequest,
  ChangeMessageVisibilityBatchCommandOutput,
  PurgeQueueRequest,
  PurgeQueueCommandOutput,
} from "@aws-sdk/client-sqs";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { ExceptionMessages } from "./exceptionMessages";
import {
  SQSExtendedClientException,
  SQSExtendedClientServiceException,
} from "./exceptions";
import { SqsExtendedClientOptions } from "./types";

const LEGACY_RESERVED_ATTRIBUTE_NAME = "SQSLargePayloadSize";
const RESERVED_ATTRIBUTE_NAME = "ExtendedPayloadSize";
const LEGACY_MESSAGE_POINTER_CLASS =
  "com.amazon.sqs.javamessaging.MessageS3Pointer";
const MESSAGE_POINTER_CLASS =
  "software.amazon.payloadoffloading.PayloadS3Pointer";
const S3_KEY_ATTRIBUTE_NAME = "S3Key";
const MAX_ALLOWED_ATTRIBUTES = 9; // 10 for SQS and 1 reserved attribute
const DEFAULT_MESSAGE_SIZE_THRESHOLD = 262144;
const S3_BUCKET_NAME_MARKER = "-..s3BucketName..-";
const S3_KEY_MARKER = "-..s3Key..-";

export class SQSExtendedClient {
  private sqs: SQSClient;
  private s3: S3Client;
  private options: SqsExtendedClientOptions;

  constructor(sqs: SQSClient, s3: S3Client, options: SqsExtendedClientOptions) {
    this.sqs = sqs;
    this.s3 = s3;
    this.options = {
      messageSizeThreshold: DEFAULT_MESSAGE_SIZE_THRESHOLD,
      alwaysThroughS3: false,
      useLegacyAttribute: false,
      ...options,
    };
  }

  private getStringSizeInBytes(s: string): number {
    return Buffer.byteLength(s, "utf-8");
  }

  private getMessageAttributesSize(
    messageAttributes: Record<string, any>
  ): number {
    let total = 0;
    for (const [key, value] of Object.entries(messageAttributes)) {
      total += this.getStringSizeInBytes(key);
      if (value.DataType) total += this.getStringSizeInBytes(value.DataType);
      if (value.StringValue)
        total += this.getStringSizeInBytes(value.StringValue);
      if (value.BinaryValue)
        total += this.getStringSizeInBytes(value.BinaryValue);
    }
    return total;
  }

  private isLarge(
    messageBody: string,
    messageAttributes: Record<string, any>
  ): boolean {
    const attrSize = this.getMessageAttributesSize(messageAttributes);
    const bodySize = this.getStringSizeInBytes(messageBody);
    return (
      attrSize + bodySize >
      (this.options.messageSizeThreshold || DEFAULT_MESSAGE_SIZE_THRESHOLD)
    );
  }

  private async storeMessageInS3(
    messageBody: string,
    messageAttributes: Record<string, any>
  ): Promise<{ body: string; attributes: Record<string, any> }> {
    if (!messageBody || messageBody.length === 0) {
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_MESSAGE_BODY
      );
    }
    const alwaysThroughS3 = this.options.alwaysThroughS3 || false;
    const largePayloadSupport = this.options.s3BucketName;
    if (
      largePayloadSupport &&
      (alwaysThroughS3 || this.isLarge(messageBody, messageAttributes))
    ) {
      this.checkMessageAttributes(messageAttributes);
      const encodedBody = Buffer.from(messageBody, "utf-8");
      const useLegacy = this.options.useLegacyAttribute || false;
      const messagePointer = useLegacy
        ? LEGACY_MESSAGE_POINTER_CLASS
        : MESSAGE_POINTER_CLASS;
      const attributeName = useLegacy
        ? LEGACY_RESERVED_ATTRIBUTE_NAME
        : RESERVED_ATTRIBUTE_NAME;
      messageAttributes[attributeName] = {
        DataType: "Number",
        StringValue: String(encodedBody.length),
      };
      const s3Key = this.getS3Key(messageAttributes);
      await this.s3.send(
        new PutObjectCommand({
          Bucket: largePayloadSupport,
          Key: s3Key,
          Body: encodedBody,
        })
      );
      const s3Pointer = JSON.stringify([
        messagePointer,
        { s3BucketName: largePayloadSupport, s3Key },
      ]);
      return { body: s3Pointer, attributes: messageAttributes };
    }
    return { body: messageBody, attributes: messageAttributes };
  }

  private getS3Key(messageAttributes: Record<string, any>): string {
    if (messageAttributes[S3_KEY_ATTRIBUTE_NAME]?.StringValue) {
      return messageAttributes[S3_KEY_ATTRIBUTE_NAME].StringValue;
    }
    return uuidv4();
  }

  private checkMessageAttributes(messageAttributes: Record<string, any>): void {
    const totalSize = this.getMessageAttributesSize(messageAttributes);
    if (
      totalSize >
      (this.options.messageSizeThreshold || DEFAULT_MESSAGE_SIZE_THRESHOLD)
    ) {
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_MESSAGE_ATTRIBUTE_SIZE.replace(
          "{0}",
          String(totalSize)
        ).replace(
          "{1}",
          String(
            this.options.messageSizeThreshold || DEFAULT_MESSAGE_SIZE_THRESHOLD
          )
        )
      );
    }
    const numAttrs = Object.keys(messageAttributes).length;
    if (numAttrs > MAX_ALLOWED_ATTRIBUTES) {
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_NUMBER_OF_MESSAGE_ATTRIBUTES.replace(
          "{0}",
          String(numAttrs)
        ).replace("{1}", String(MAX_ALLOWED_ATTRIBUTES))
      );
    }
    if (
      messageAttributes[RESERVED_ATTRIBUTE_NAME] ||
      messageAttributes[LEGACY_RESERVED_ATTRIBUTE_NAME]
    ) {
      const reserved = messageAttributes[RESERVED_ATTRIBUTE_NAME]
        ? RESERVED_ATTRIBUTE_NAME
        : LEGACY_RESERVED_ATTRIBUTE_NAME;
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_ATTRIBUTE_NAME_PRESENT.replace(
          "{0}",
          reserved
        )
      );
    }
  }

  private getReservedAttributeNameIfPresent(
    messageAttributes: Record<string, unknown>
  ): string {
    if (RESERVED_ATTRIBUTE_NAME in messageAttributes)
      return RESERVED_ATTRIBUTE_NAME;
    if (LEGACY_RESERVED_ATTRIBUTE_NAME in messageAttributes)
      return LEGACY_RESERVED_ATTRIBUTE_NAME;
    return "";
  }

  private async retrieveMessageFromS3(messageBody: string): Promise<string> {
    let parsed;
    try {
      parsed = JSON.parse(messageBody);
    } catch {
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES
      );
    }
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 2 ||
      typeof parsed[1] !== "object"
    ) {
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES
      );
    }
    const { s3BucketName, s3Key } = parsed[1];
    const response = await this.s3.send(
      new GetObjectCommand({ Bucket: s3BucketName, Key: s3Key })
    );
    const stream = response.Body as any;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  getS3PointerInReceiptHandle(message: any): string {
    const receiptHandle = message.ReceiptHandle;
    let messageBody;
    try {
      messageBody = JSON.parse(message.Body);
    } catch {
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES
      );
    }
    if (
      !Array.isArray(messageBody) ||
      messageBody.length !== 2 ||
      typeof messageBody[1] !== "object"
    ) {
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES
      );
    }
    const s3BucketName = messageBody[1].s3BucketName;
    const s3Key = messageBody[1].s3Key;
    return `${S3_BUCKET_NAME_MARKER}${s3BucketName}${S3_BUCKET_NAME_MARKER}${S3_KEY_MARKER}${s3Key}${S3_KEY_MARKER}${receiptHandle}`;
  }

  private isS3ReceiptHandle(receiptHandle: string): boolean {
    return (
      receiptHandle.includes(S3_BUCKET_NAME_MARKER) &&
      receiptHandle.includes(S3_KEY_MARKER)
    );
  }

  getOriginalReceiptHandle(modifiedReceiptHandle: string): string {
    return modifiedReceiptHandle.split(S3_KEY_MARKER).pop() || "";
  }

  private getFromReceiptHandleByMarker(
    modifiedReceiptHandle: string,
    marker: string
  ): string {
    const first = modifiedReceiptHandle.indexOf(marker);
    const second = modifiedReceiptHandle.indexOf(marker, first + marker.length);
    return modifiedReceiptHandle.substring(first + marker.length, second);
  }

  private async deleteMessageFromS3(
    modifiedReceiptHandle: string
  ): Promise<void> {
    const s3BucketName = this.getFromReceiptHandleByMarker(
      modifiedReceiptHandle,
      S3_BUCKET_NAME_MARKER
    );
    const s3Key = this.getFromReceiptHandleByMarker(
      modifiedReceiptHandle,
      S3_KEY_MARKER
    );
    const response = await this.s3.send(
      new DeleteObjectCommand({ Bucket: s3BucketName, Key: s3Key })
    );
    const statusCode = response["$metadata"]?.httpStatusCode;
    if (statusCode !== 204) {
      throw new SQSExtendedClientServiceException(
        ExceptionMessages.FAILED_DELETE_MESSAGE_FROM_S3.replace(
          "{0}",
          String(statusCode)
        )
      );
    }
  }

  async sendMessage(
    params: SendMessageRequest
  ): Promise<SendMessageCommandOutput> {
    const { body, attributes } = await this.storeMessageInS3(
      params.MessageBody!,
      params.MessageAttributes || {}
    );
    const input: SendMessageCommandInput = {
      ...params,
      MessageBody: body,
      MessageAttributes: attributes,
    };
    return this.sqs.send(new SendMessageCommand(input));
  }

  async receiveMessage(
    params: ReceiveMessageRequest
  ): Promise<ReceiveMessageCommandOutput> {
    params.MessageAttributeNames =
      this.getMessageAtrributeNamesForReceiveMessage(
        params.MessageAttributeNames
      );
    const response = await this.sqs.send(new ReceiveMessageCommand(params));
    if (response.Messages) {
      for (const message of response.Messages) {
        await this.parseMessage(message, { inPlace: true });
      }
    }
    return response;
  }

  async parseMessage(message: Message, { inPlace = false }): Promise<Message> {
    const messageAttributes = message.MessageAttributes || {};

    if (!inPlace) {
      message = { ...message };
    }

    if (
      messageAttributes[RESERVED_ATTRIBUTE_NAME] ||
      messageAttributes[LEGACY_RESERVED_ATTRIBUTE_NAME]
    ) {
      message.ReceiptHandle = this.getS3PointerInReceiptHandle(message);
      message.Body = await this.retrieveMessageFromS3(message.Body!);
      delete messageAttributes[RESERVED_ATTRIBUTE_NAME];
      delete messageAttributes[LEGACY_RESERVED_ATTRIBUTE_NAME];
    }
    return message;
  }

  getMessageAtrributeNamesForReceiveMessage(
    initial?: ReceiveMessageRequest["MessageAttributeNames"]
  ) {
    const requestedAttributes = initial?.slice() ?? [];
    if (
      !requestedAttributes.includes("All") &&
      !requestedAttributes.includes(".*") &&
      !requestedAttributes.includes(RESERVED_ATTRIBUTE_NAME) &&
      !requestedAttributes.includes(LEGACY_RESERVED_ATTRIBUTE_NAME)
    ) {
      if (this.options.useLegacyAttribute) {
        requestedAttributes.push(LEGACY_RESERVED_ATTRIBUTE_NAME);
      } else {
        requestedAttributes.push(RESERVED_ATTRIBUTE_NAME);
      }
    }
    return requestedAttributes;
  }

  async deleteMessage(
    params: DeleteMessageRequest
  ): Promise<DeleteMessageCommandOutput> {
    const receiptHandle = params.ReceiptHandle!;
    if (this.isS3ReceiptHandle(receiptHandle)) {
      await this.deleteMessageFromS3(receiptHandle);
      params.ReceiptHandle = this.getOriginalReceiptHandle(receiptHandle);
    }
    return this.sqs.send(new DeleteMessageCommand(params));
  }

  async sendMessageBatch(
    params: SendMessageBatchRequest
  ): Promise<SendMessageBatchCommandOutput> {
    if (this.options.s3BucketName) {
      for (const entry of params.Entries!) {
        const { body, attributes } = await this.storeMessageInS3(
          entry.MessageBody!,
          entry.MessageAttributes || {}
        );
        entry.MessageBody = body;
        entry.MessageAttributes = attributes;
      }
    }
    return this.sqs.send(new SendMessageBatchCommand(params));
  }

  async deleteMessageBatch(
    params: DeleteMessageBatchRequest
  ): Promise<DeleteMessageBatchCommandOutput> {
    if (this.options.s3BucketName) {
      for (const entry of params.Entries!) {
        if (this.isS3ReceiptHandle(entry.ReceiptHandle!)) {
          await this.deleteMessageFromS3(entry.ReceiptHandle!);
          entry.ReceiptHandle = this.getOriginalReceiptHandle(
            entry.ReceiptHandle!
          );
        }
      }
    }
    return this.sqs.send(new DeleteMessageBatchCommand(params));
  }

  async changeMessageVisibility(
    params: ChangeMessageVisibilityRequest
  ): Promise<ChangeMessageVisibilityCommandOutput> {
    if (this.isS3ReceiptHandle(params.ReceiptHandle!)) {
      params.ReceiptHandle = this.getOriginalReceiptHandle(
        params.ReceiptHandle!
      );
    }
    return this.sqs.send(new ChangeMessageVisibilityCommand(params));
  }

  async changeMessageVisibilityBatch(
    params: ChangeMessageVisibilityBatchRequest
  ): Promise<ChangeMessageVisibilityBatchCommandOutput> {
    for (const entry of params.Entries!) {
      if (this.isS3ReceiptHandle(entry.ReceiptHandle!)) {
        entry.ReceiptHandle = this.getOriginalReceiptHandle(
          entry.ReceiptHandle!
        );
      }
    }
    return this.sqs.send(new ChangeMessageVisibilityBatchCommand(params));
  }

  async purgeQueue(
    params: PurgeQueueRequest
  ): Promise<PurgeQueueCommandOutput> {
    console.warn(
      "Calling purgeQueue deletes SQS messages without deleting their payload from S3."
    );
    return this.sqs.send(new PurgeQueueCommand(params));
  }
}
