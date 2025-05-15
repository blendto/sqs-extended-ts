export class SQSExtendedClientException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SQSExtendedClientException';
  }
}

export class SQSExtendedClientServiceException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SQSExtendedClientServiceException';
  }
}
