import {
  ChangeMessageVisibilityBatchCommand,
  ChangeMessageVisibilityCommand,
  DeleteMessageBatchCommand,
  DeleteMessageCommand,
  PurgeQueueCommand,
  ReceiveMessageCommand,
  SendMessageBatchCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { SQSExtendedBridge } from "./bridge";

class SQSExtendedClient extends SQSExtendedBridge implements SQSClient {
  send: SQSClient["send"] = (command) => {
    if (command instanceof SendMessageCommand) {
      return this.sendMessage(command.input);
    } else if (command instanceof ReceiveMessageCommand) {
      return this.receiveMessage(command.input);
    } else if (command instanceof DeleteMessageCommand) {
      return this.deleteMessage(command.input);
    } else if (command instanceof ChangeMessageVisibilityCommand) {
      return this.changeMessageVisibility(command.input);
    } else if (command instanceof PurgeQueueCommand) {
      return this.purgeQueue(command.input);
    } else if (command instanceof SendMessageBatchCommand) {
      return this.sendMessageBatch(command.input);
    } else if (command instanceof DeleteMessageBatchCommand) {
      return this.deleteMessageBatch(command.input);
    } else if (command instanceof ChangeMessageVisibilityBatchCommand) {
      return this.changeMessageVisibilityBatch(command.input);
    }

    return this.sqs.send(command);
  };

  public get config() {
    return this.sqs.config;
  }

  destroy(): void {
    throw new Error("Destroy sqs and s3 objects individually");
  }

  public get middlewareStack() {
    return this.sqs.middlewareStack;
  }

  public get initConfig() {
    return this.sqs.initConfig;
  }
}

export default SQSExtendedClient;
