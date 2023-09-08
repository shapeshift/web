"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createErrorClass = void 0;
var createErrorClass_1 = require("./createErrorClass");
Object.defineProperty(exports, "createErrorClass", { enumerable: true, get: function () { return createErrorClass_1.createErrorClass; } });
__exportStar(require("./ErrorWithCause"), exports);
__exportStar(require("./ErrorWithDetails"), exports);
__exportStar(require("./ForbiddenError"), exports);
__exportStar(require("./NotFoundError"), exports);
__exportStar(require("./UnauthorizedError"), exports);
__exportStar(require("./ValidationError"), exports);
__exportStar(require("./RateLimitError"), exports);
