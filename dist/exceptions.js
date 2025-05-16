"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQSExtendedClientServiceException = exports.SQSExtendedClientException = void 0;
class SQSExtendedClientException extends Error {
    constructor(message) {
        super(message);
        this.name = 'SQSExtendedClientException';
    }
}
exports.SQSExtendedClientException = SQSExtendedClientException;
class SQSExtendedClientServiceException extends Error {
    constructor(message) {
        super(message);
        this.name = 'SQSExtendedClientServiceException';
    }
}
exports.SQSExtendedClientServiceException = SQSExtendedClientServiceException;
