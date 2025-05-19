"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ExceptionMessages: () => ExceptionMessages,
  SQSExtendedClientException: () => SQSExtendedClientException,
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var import_client_sqs = require("@aws-sdk/client-sqs");
var import_client_s3 = require("@aws-sdk/client-s3");

// node_modules/uuid/dist/esm-node/rng.js
var import_crypto = __toESM(require("crypto"));
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    import_crypto.default.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// node_modules/uuid/dist/esm-node/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}

// node_modules/uuid/dist/esm-node/native.js
var import_crypto2 = __toESM(require("crypto"));
var native_default = {
  randomUUID: import_crypto2.default.randomUUID
};

// node_modules/uuid/dist/esm-node/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// src/exceptionMessages.ts
var ExceptionMessages = {
  INVALID_ARGUMENTS_FOR_SEND_MESSAGE: "Invalid number of arguments while calling send_message.",
  INVALID_ARGUMENTS_FOR_RECEIVE_MESSAGE: "Invalid number of arguments while calling receive_message.",
  INVALID_ARGUMENTS_FOR_DELETE_MESSAGE: "Invalid number of arguments while calling delete_message.",
  INVALID_ARGUMENTS_FOR_CHANGE_MESSAGE_VISIBILITY: "Invalid number of arguments while calling change_message_visibility.",
  INVALID_ARGUMENTS_FOR_PURGE_QUEUE: "Invalid number of arguments while calling purge_queue.",
  INVALID_ARGUMENTS_FOR_CHANGE_MESSAGE_VISIBILITY_BATCH: "Invalid number of arguments while calling change_message_visibility_batch.",
  INVALID_ARGUMENTS_FOR_SEND_MESSAGE_BATCH: "Invalid number of arguments while calling send_message_batch.",
  INVALID_ARGUMENTS_FOR_DELETE_MESSAGE_BATCH: "Invalid number of arguments while calling delete_message_batch.",
  INVALID_MESSAGE_ATTRIBUTE_SIZE: "Total size of message attributes is {0} bytes which is larger than the threshold of {1} bytes. Consider including the payload in the message body instead of the message attributes. ",
  INVALID_NUMBER_OF_MESSAGE_ATTRIBUTES: "Number of message attributes {0} exceeds the maximum allowed for large-payload messages {1} ",
  INVALID_ATTRIBUTE_NAME_PRESENT: "Message attribute name {0} is reserved for use by the SQS extended client. ",
  INVALID_MESSAGE_BODY: "messageBody cannot be null or empty.",
  INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES: "Invalid payload format for retrieving stored messages in S3",
  FAILED_DELETE_MESSAGE_FROM_S3: "delete_object failed with status code {0}"
};

// src/exceptions.ts
var SQSExtendedClientException = class extends Error {
  constructor(message) {
    super(message);
    this.name = "SQSExtendedClientException";
  }
};
var SQSExtendedClientServiceException = class extends Error {
  constructor(message) {
    super(message);
    this.name = "SQSExtendedClientServiceException";
  }
};

// src/client.ts
var LEGACY_RESERVED_ATTRIBUTE_NAME = "SQSLargePayloadSize";
var RESERVED_ATTRIBUTE_NAME = "ExtendedPayloadSize";
var LEGACY_MESSAGE_POINTER_CLASS = "com.amazon.sqs.javamessaging.MessageS3Pointer";
var MESSAGE_POINTER_CLASS = "software.amazon.payloadoffloading.PayloadS3Pointer";
var S3_KEY_ATTRIBUTE_NAME = "S3Key";
var MAX_ALLOWED_ATTRIBUTES = 9;
var DEFAULT_MESSAGE_SIZE_THRESHOLD = 262144;
var S3_BUCKET_NAME_MARKER = "-..s3BucketName..-";
var S3_KEY_MARKER = "-..s3Key..-";
var SQSExtendedClient = class {
  constructor(sqs, s3, options) {
    this.sqs = sqs;
    this.s3 = s3;
    this.options = {
      messageSizeThreshold: DEFAULT_MESSAGE_SIZE_THRESHOLD,
      alwaysThroughS3: false,
      useLegacyAttribute: false,
      ...options
    };
  }
  getStringSizeInBytes(s) {
    return Buffer.byteLength(s, "utf-8");
  }
  getMessageAttributesSize(messageAttributes) {
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
  isLarge(messageBody, messageAttributes) {
    const attrSize = this.getMessageAttributesSize(messageAttributes);
    const bodySize = this.getStringSizeInBytes(messageBody);
    return attrSize + bodySize > (this.options.messageSizeThreshold || DEFAULT_MESSAGE_SIZE_THRESHOLD);
  }
  async storeMessageInS3(messageBody, messageAttributes) {
    if (!messageBody || messageBody.length === 0) {
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_MESSAGE_BODY
      );
    }
    const alwaysThroughS3 = this.options.alwaysThroughS3 || false;
    const largePayloadSupport = this.options.s3BucketName;
    if (largePayloadSupport && (alwaysThroughS3 || this.isLarge(messageBody, messageAttributes))) {
      this.checkMessageAttributes(messageAttributes);
      const encodedBody = Buffer.from(messageBody, "utf-8");
      const useLegacy = this.options.useLegacyAttribute || false;
      const messagePointer = useLegacy ? LEGACY_MESSAGE_POINTER_CLASS : MESSAGE_POINTER_CLASS;
      const attributeName = useLegacy ? LEGACY_RESERVED_ATTRIBUTE_NAME : RESERVED_ATTRIBUTE_NAME;
      messageAttributes[attributeName] = {
        DataType: "Number",
        StringValue: String(encodedBody.length)
      };
      const s3Key = this.getS3Key(messageAttributes);
      await this.s3.send(
        new import_client_s3.PutObjectCommand({
          Bucket: largePayloadSupport,
          Key: s3Key,
          Body: encodedBody
        })
      );
      const s3Pointer = JSON.stringify([
        messagePointer,
        { s3BucketName: largePayloadSupport, s3Key }
      ]);
      return { body: s3Pointer, attributes: messageAttributes };
    }
    return { body: messageBody, attributes: messageAttributes };
  }
  getS3Key(messageAttributes) {
    if (messageAttributes[S3_KEY_ATTRIBUTE_NAME]?.StringValue) {
      return messageAttributes[S3_KEY_ATTRIBUTE_NAME].StringValue;
    }
    return v4_default();
  }
  checkMessageAttributes(messageAttributes) {
    const totalSize = this.getMessageAttributesSize(messageAttributes);
    if (totalSize > (this.options.messageSizeThreshold || DEFAULT_MESSAGE_SIZE_THRESHOLD)) {
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
    if (messageAttributes[RESERVED_ATTRIBUTE_NAME] || messageAttributes[LEGACY_RESERVED_ATTRIBUTE_NAME]) {
      const reserved = messageAttributes[RESERVED_ATTRIBUTE_NAME] ? RESERVED_ATTRIBUTE_NAME : LEGACY_RESERVED_ATTRIBUTE_NAME;
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_ATTRIBUTE_NAME_PRESENT.replace(
          "{0}",
          reserved
        )
      );
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
    } catch {
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES
      );
    }
    if (!Array.isArray(parsed) || parsed.length !== 2 || typeof parsed[1] !== "object") {
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES
      );
    }
    const { s3BucketName, s3Key } = parsed[1];
    const response = await this.s3.send(
      new import_client_s3.GetObjectCommand({ Bucket: s3BucketName, Key: s3Key })
    );
    const stream = response.Body;
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }
  getS3PointerInReceiptHandle(message) {
    const receiptHandle = message.ReceiptHandle;
    let messageBody;
    try {
      messageBody = JSON.parse(message.Body);
    } catch {
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES
      );
    }
    if (!Array.isArray(messageBody) || messageBody.length !== 2 || typeof messageBody[1] !== "object") {
      throw new SQSExtendedClientException(
        ExceptionMessages.INVALID_FORMAT_WHEN_RETRIEVING_STORED_S3_MESSAGES
      );
    }
    const s3BucketName = messageBody[1].s3BucketName;
    const s3Key = messageBody[1].s3Key;
    return `${S3_BUCKET_NAME_MARKER}${s3BucketName}${S3_BUCKET_NAME_MARKER}${S3_KEY_MARKER}${s3Key}${S3_KEY_MARKER}${receiptHandle}`;
  }
  isS3ReceiptHandle(receiptHandle) {
    return receiptHandle.includes(S3_BUCKET_NAME_MARKER) && receiptHandle.includes(S3_KEY_MARKER);
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
    const s3BucketName = this.getFromReceiptHandleByMarker(
      modifiedReceiptHandle,
      S3_BUCKET_NAME_MARKER
    );
    const s3Key = this.getFromReceiptHandleByMarker(
      modifiedReceiptHandle,
      S3_KEY_MARKER
    );
    const response = await this.s3.send(
      new import_client_s3.DeleteObjectCommand({ Bucket: s3BucketName, Key: s3Key })
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
  async sendMessage(params) {
    const { body, attributes } = await this.storeMessageInS3(
      params.MessageBody,
      params.MessageAttributes || {}
    );
    const input = {
      ...params,
      MessageBody: body,
      MessageAttributes: attributes
    };
    return this.sqs.send(new import_client_sqs.SendMessageCommand(input));
  }
  async receiveMessage(params) {
    params.MessageAttributeNames = this.getMessageAtrributeNamesForReceiveMessage(
      params.MessageAttributeNames
    );
    const response = await this.sqs.send(new import_client_sqs.ReceiveMessageCommand(params));
    if (response.Messages) {
      for (const message of response.Messages) {
        await this.parseMessage(message);
      }
    }
    return response;
  }
  async parseMessage(message) {
    const messageAttributes = message.MessageAttributes || {};
    if (messageAttributes[RESERVED_ATTRIBUTE_NAME] || messageAttributes[LEGACY_RESERVED_ATTRIBUTE_NAME]) {
      message.ReceiptHandle = this.getS3PointerInReceiptHandle(message);
      message.Body = await this.retrieveMessageFromS3(message.Body);
      delete messageAttributes[RESERVED_ATTRIBUTE_NAME];
      delete messageAttributes[LEGACY_RESERVED_ATTRIBUTE_NAME];
    }
    return message;
  }
  getMessageAtrributeNamesForReceiveMessage(initial) {
    const requestedAttributes = initial?.slice() ?? [];
    if (!requestedAttributes.includes("All") && !requestedAttributes.includes(".*") && !requestedAttributes.includes(RESERVED_ATTRIBUTE_NAME) && !requestedAttributes.includes(LEGACY_RESERVED_ATTRIBUTE_NAME)) {
      if (this.options.useLegacyAttribute) {
        requestedAttributes.push(LEGACY_RESERVED_ATTRIBUTE_NAME);
      } else {
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
    return this.sqs.send(new import_client_sqs.DeleteMessageCommand(params));
  }
  async sendMessageBatch(params) {
    if (this.options.s3BucketName) {
      for (const entry of params.Entries) {
        const { body, attributes } = await this.storeMessageInS3(
          entry.MessageBody,
          entry.MessageAttributes || {}
        );
        entry.MessageBody = body;
        entry.MessageAttributes = attributes;
      }
    }
    return this.sqs.send(new import_client_sqs.SendMessageBatchCommand(params));
  }
  async deleteMessageBatch(params) {
    if (this.options.s3BucketName) {
      for (const entry of params.Entries) {
        if (this.isS3ReceiptHandle(entry.ReceiptHandle)) {
          await this.deleteMessageFromS3(entry.ReceiptHandle);
          entry.ReceiptHandle = this.getOriginalReceiptHandle(
            entry.ReceiptHandle
          );
        }
      }
    }
    return this.sqs.send(new import_client_sqs.DeleteMessageBatchCommand(params));
  }
  async changeMessageVisibility(params) {
    if (this.isS3ReceiptHandle(params.ReceiptHandle)) {
      params.ReceiptHandle = this.getOriginalReceiptHandle(
        params.ReceiptHandle
      );
    }
    return this.sqs.send(new import_client_sqs.ChangeMessageVisibilityCommand(params));
  }
  async changeMessageVisibilityBatch(params) {
    for (const entry of params.Entries) {
      if (this.isS3ReceiptHandle(entry.ReceiptHandle)) {
        entry.ReceiptHandle = this.getOriginalReceiptHandle(
          entry.ReceiptHandle
        );
      }
    }
    return this.sqs.send(new import_client_sqs.ChangeMessageVisibilityBatchCommand(params));
  }
  async purgeQueue(params) {
    console.warn(
      "Calling purgeQueue deletes SQS messages without deleting their payload from S3."
    );
    return this.sqs.send(new import_client_sqs.PurgeQueueCommand(params));
  }
};

// src/index.ts
var index_default = SQSExtendedClient;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ExceptionMessages,
  SQSExtendedClientException
});
