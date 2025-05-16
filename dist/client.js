"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQSExtendedClient = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const client_sqs_1 = require("@aws-sdk/client-sqs");
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const exceptionMessages_1 = require("./exceptionMessages");
const exceptions_1 = require("./exceptions");
const LEGACY_RESERVED_ATTRIBUTE_NAME = "SQSLargePayloadSize";
const RESERVED_ATTRIBUTE_NAME = "ExtendedPayloadSize";
const LEGACY_MESSAGE_POINTER_CLASS = "com.amazon.sqs.javamessaging.MessageS3Pointer";
const MESSAGE_POINTER_CLASS = "software.amazon.payloadoffloading.PayloadS3Pointer";
const S3_KEY_ATTRIBUTE_NAME = "S3Key";
const MAX_ALLOWED_ATTRIBUTES = 9; // 10 for SQS and 1 reserved attribute
const DEFAULT_MESSAGE_SIZE_THRESHOLD = 262144;
const S3_BUCKET_NAME_MARKER = "-..s3BucketName..-";
const S3_KEY_MARKER = "-..s3Key..-";
class SQSExtendedClient {
    constructor(sqs, s3, options) {
        this.sqs = sqs;
        this.s3 = s3;
        this.options = {
            messageSizeThreshold: DEFAULT_MESSAGE_SIZE_THRESHOLD,
            alwaysThroughS3: false,
            useLegacyAttribute: false,
            ...options,
        };
    }
    getStringSizeInBytes(s) {
        return Buffer.byteLength(s, "utf-8");
    }
    getMessageAttributesSize(messageAttributes) {
        let total = 0;
        for (const [key, value] of Object.entries(messageAttributes)) {
            total += this.getStringSizeInBytes(key);
            if (value.DataType)
                total += this.getStringSizeInBytes(value.DataType);
            if (value.StringValue)
                total += this.getStringSizeInBytes(value.StringValue);
            if (value.BinaryValue)
                total += this.getStringSizeInBytes(value.BinaryValue);
        }
        return total;
    }
    isLarge(messageBody, messageAttributes) {
        const attrSize = this.getMessageAttributesSize(messageAttributes);
        const bodySize = this.getStringSizeInBytes(messageBody);
        return (attrSize + bodySize >
            (this.options.messageSizeThreshold || DEFAULT_MESSAGE_SIZE_THRESHOLD));
    }
    async storeMessageInS3(messageBody, messageAttributes) {
        if (!messageBody || messageBody.length === 0) {
            throw new exceptions_1.SQSExtendedClientException(exceptionMessages_1.ExceptionMessages.INVALID_MESSAGE_BODY);
        }
        const alwaysThroughS3 = this.options.alwaysThroughS3 || false;
        const largePayloadSupport = this.options.s3BucketName;
        if (largePayloadSupport &&
            (alwaysThroughS3 || this.isLarge(messageBody, messageAttributes))) {
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
            await this.s3.send(new client_s3_1.PutObjectCommand({
                Bucket: largePayloadSupport,
                Key: s3Key,
                Body: encodedBody,
            }));
            const s3Pointer = JSON.stringify([
                messagePointer,
                { s3BucketName: largePayloadSupport, s3Key },
            ]);
            return { body: s3Pointer, attributes: messageAttributes };
        }
        return { body: messageBody, attributes: messageAttributes };
    }
    getS3Key(messageAttributes) {
        if (messageAttributes[S3_KEY_ATTRIBUTE_NAME]?.StringValue) {
            return messageAttributes[S3_KEY_ATTRIBUTE_NAME].StringValue;
        }
        return (0, uuid_1.v4)();
    }
    checkMessageAttributes(messageAttributes) {
        const totalSize = this.getMessageAttributesSize(messageAttributes);
        if (totalSize >
            (this.options.messageSizeThreshold || DEFAULT_MESSAGE_SIZE_THRESHOLD)) {
            throw new exceptions_1.SQSExtendedClientException(exceptionMessages_1.ExceptionMessages.INVALID_MESSAGE_ATTRIBUTE_SIZE.replace("{0}", String(totalSize)).replace("{1}", String(this.options.messageSizeThreshold || DEFAULT_MESSAGE_SIZE_THRESHOLD)));
        }
        const numAttrs = Object.keys(messageAttributes).length;
        if (numAttrs > MAX_ALLOWED_ATTRIBUTES) {
            throw new exceptions_1.SQSExtendedClientException(exceptionMessages_1.ExceptionMessages.INVALID_NUMBER_OF_MESSAGE_ATTRIBUTES.replace("{0}", String(numAttrs)).replace("{1}", String(MAX_ALLOWED_ATTRIBUTES)));
        }
        if (messageAttributes[RESERVED_ATTRIBUTE_NAME] ||
            messageAttributes[LEGACY_RESERVED_ATTRIBUTE_NAME]) {
            const reserved = messageAttributes[RESERVED_ATTRIBUTE_NAME]
                ? RESERVED_ATTRIBUTE_NAME
                : LEGACY_RESERVED_ATTRIBUTE_NAME;
            throw new exceptions_1.SQSExtendedClientException(exceptionMessages_1.ExceptionMessages.INVALID_ATTRIBUTE_NAME_PRESENT.replace("{0}", reserved));
        }
    }
    getReservedAttributeNameIfPresent(messageAttributes) {
        if (RESERVED_ATTRIBUTE_NAME in messageAttributes)
            return RESERVED_ATTRIBUTE_NAME;
        if (LEGACY_RESERVED_ATTRIBUTE_NAME in messageAttributes)
            return LEGACY_RESERVED_ATTRIBUTE_NAME;
        return "";
    }
    async retrieveMessageFromS3(messageBody) {
        let parsed;
        try {
            parsed = JSON.parse(messageBody);
        }
        catch {
            throw new exceptions_1.SQSExtendedClientException(exceptionMessages_1.ExceptionMessages.INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES);
        }
        if (!Array.isArray(parsed) ||
            parsed.length !== 2 ||
            typeof parsed[1] !== "object") {
            throw new exceptions_1.SQSExtendedClientException(exceptionMessages_1.ExceptionMessages.INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES);
        }
        const { s3BucketName, s3Key } = parsed[1];
        const response = await this.s3.send(new client_s3_1.GetObjectCommand({ Bucket: s3BucketName, Key: s3Key }));
        const stream = response.Body;
        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks).toString("utf-8");
    }
    embedS3PointerInReceiptHandle(message) {
        const receiptHandle = message.ReceiptHandle;
        let messageBody;
        try {
            messageBody = JSON.parse(message.Body);
        }
        catch {
            throw new exceptions_1.SQSExtendedClientException(exceptionMessages_1.ExceptionMessages.INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES);
        }
        if (!Array.isArray(messageBody) ||
            messageBody.length !== 2 ||
            typeof messageBody[1] !== "object") {
            throw new exceptions_1.SQSExtendedClientException(exceptionMessages_1.ExceptionMessages.INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES);
        }
        const s3BucketName = messageBody[1].s3BucketName;
        const s3Key = messageBody[1].s3Key;
        return `${S3_BUCKET_NAME_MARKER}${s3BucketName}${S3_BUCKET_NAME_MARKER}${S3_KEY_MARKER}${s3Key}${S3_KEY_MARKER}${receiptHandle}`;
    }
    isS3ReceiptHandle(receiptHandle) {
        return (receiptHandle.includes(S3_BUCKET_NAME_MARKER) &&
            receiptHandle.includes(S3_KEY_MARKER));
    }
    getOriginalReceiptHandle(modifiedReceiptHandle) {
        return modifiedReceiptHandle.split(S3_KEY_MARKER).pop() || "";
    }
    getFromReceiptHandleByMarker(modifiedReceiptHandle, marker) {
        const first = modifiedReceiptHandle.indexOf(marker);
        const second = modifiedReceiptHandle.indexOf(marker, first + marker.length);
        return modifiedReceiptHandle.substring(first + marker.length, second);
    }
    async deleteMessageFromS3(modifiedReceiptHandle) {
        const s3BucketName = this.getFromReceiptHandleByMarker(modifiedReceiptHandle, S3_BUCKET_NAME_MARKER);
        const s3Key = this.getFromReceiptHandleByMarker(modifiedReceiptHandle, S3_KEY_MARKER);
        const response = await this.s3.send(new client_s3_1.DeleteObjectCommand({ Bucket: s3BucketName, Key: s3Key }));
        const statusCode = response["$metadata"]?.httpStatusCode;
        if (statusCode !== 204) {
            throw new exceptions_1.SQSExtendedClientServiceException(exceptionMessages_1.ExceptionMessages.FAILED_DELETE_MESSAGE_FROM_S3.replace("{0}", String(statusCode)));
        }
    }
    async sendMessage(params) {
        const { body, attributes } = await this.storeMessageInS3(params.MessageBody, params.MessageAttributes || {});
        const input = {
            ...params,
            MessageBody: body,
            MessageAttributes: attributes,
        };
        return this.sqs.send(new client_sqs_1.SendMessageCommand(input));
    }
    async receiveMessage(params) {
        params.MessageAttributeNames =
            this.getMessageAtrributeNamesForReceiveMessage(params.MessageAttributeNames);
        const response = await this.sqs.send(new client_sqs_1.ReceiveMessageCommand(params));
        if (response.Messages) {
            for (const message of response.Messages) {
                await this.parseMessage(message);
            }
        }
        return response;
    }
    async parseMessage(message) {
        const messageAttributes = message.MessageAttributes || {};
        if (messageAttributes[RESERVED_ATTRIBUTE_NAME] ||
            messageAttributes[LEGACY_RESERVED_ATTRIBUTE_NAME]) {
            message.ReceiptHandle = this.embedS3PointerInReceiptHandle(message);
            message.Body = await this.retrieveMessageFromS3(message.Body);
            delete messageAttributes[RESERVED_ATTRIBUTE_NAME];
            delete messageAttributes[LEGACY_RESERVED_ATTRIBUTE_NAME];
        }
        return message;
    }
    getMessageAtrributeNamesForReceiveMessage(initial) {
        const requestedAttributes = initial?.slice() ?? [];
        if (!requestedAttributes.includes("All") &&
            !requestedAttributes.includes(".*") &&
            !requestedAttributes.includes(RESERVED_ATTRIBUTE_NAME) &&
            !requestedAttributes.includes(LEGACY_RESERVED_ATTRIBUTE_NAME)) {
            if (this.options.useLegacyAttribute) {
                requestedAttributes.push(LEGACY_RESERVED_ATTRIBUTE_NAME);
            }
            else {
                requestedAttributes.push(RESERVED_ATTRIBUTE_NAME);
            }
        }
        return requestedAttributes;
    }
    async deleteMessage(params) {
        const receiptHandle = params.ReceiptHandle;
        if (this.isS3ReceiptHandle(receiptHandle)) {
            await this.deleteMessageFromS3(receiptHandle);
            params.ReceiptHandle = this.getOriginalReceiptHandle(receiptHandle);
        }
        return this.sqs.send(new client_sqs_1.DeleteMessageCommand(params));
    }
    async sendMessageBatch(params) {
        if (this.options.s3BucketName) {
            for (const entry of params.Entries) {
                const { body, attributes } = await this.storeMessageInS3(entry.MessageBody, entry.MessageAttributes || {});
                entry.MessageBody = body;
                entry.MessageAttributes = attributes;
            }
        }
        return this.sqs.send(new client_sqs_1.SendMessageBatchCommand(params));
    }
    async deleteMessageBatch(params) {
        if (this.options.s3BucketName) {
            for (const entry of params.Entries) {
                if (this.isS3ReceiptHandle(entry.ReceiptHandle)) {
                    await this.deleteMessageFromS3(entry.ReceiptHandle);
                    entry.ReceiptHandle = this.getOriginalReceiptHandle(entry.ReceiptHandle);
                }
            }
        }
        return this.sqs.send(new client_sqs_1.DeleteMessageBatchCommand(params));
    }
    async changeMessageVisibility(params) {
        if (this.isS3ReceiptHandle(params.ReceiptHandle)) {
            params.ReceiptHandle = this.getOriginalReceiptHandle(params.ReceiptHandle);
        }
        return this.sqs.send(new client_sqs_1.ChangeMessageVisibilityCommand(params));
    }
    async changeMessageVisibilityBatch(params) {
        for (const entry of params.Entries) {
            if (this.isS3ReceiptHandle(entry.ReceiptHandle)) {
                entry.ReceiptHandle = this.getOriginalReceiptHandle(entry.ReceiptHandle);
            }
        }
        return this.sqs.send(new client_sqs_1.ChangeMessageVisibilityBatchCommand(params));
    }
    async purgeQueue(params) {
        console.warn("Calling purgeQueue deletes SQS messages without deleting their payload from S3.");
        return this.sqs.send(new client_sqs_1.PurgeQueueCommand(params));
    }
}
exports.SQSExtendedClient = SQSExtendedClient;
