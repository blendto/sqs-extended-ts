"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExceptionMessages = exports.SQSExtendedClientException = void 0;
const client_1 = require("./client");
exports.default = client_1.SQSExtendedClient;
var exceptions_1 = require("./exceptions");
Object.defineProperty(exports, "SQSExtendedClientException", { enumerable: true, get: function () { return exceptions_1.SQSExtendedClientException; } });
var exceptionMessages_1 = require("./exceptionMessages");
Object.defineProperty(exports, "ExceptionMessages", { enumerable: true, get: function () { return exceptionMessages_1.ExceptionMessages; } });
