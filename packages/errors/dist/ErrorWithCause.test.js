"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ErrorWithCause_1 = require("./ErrorWithCause");
describe('ErrorWithCause', () => {
    it('should create an error with no message', () => {
        const e = new ErrorWithCause_1.ErrorWithCause();
        expect(e).toBeInstanceOf(ErrorWithCause_1.ErrorWithCause);
        expect(e.message).toBe('');
        expect(e.cause).toBeUndefined();
    });
    it('should create an error with a message', () => {
        const e = new ErrorWithCause_1.ErrorWithCause('test message');
        expect(e.message).toBe('test message');
        expect(e.cause).toBeUndefined();
    });
    it('should create an error with a message and a cause', () => {
        const cause = new TypeError('cause');
        const e = new ErrorWithCause_1.ErrorWithCause('test message', { cause });
        expect(e.message).toBe('test message');
        expect(e.cause).toBe(cause);
    });
    it('should support typed cause', () => {
        const cause = 'String Error';
        const e = new ErrorWithCause_1.ErrorWithCause('test message', { cause });
        expect(e.message).toBe('test message');
        expect(e.cause).toBe(cause);
        // Check that TypeScript sees e.cause as a string so there's no type error
        expect(e.cause.toLowerCase()).toBe('string error');
    });
    it('should error on mismatched typed cause', () => {
        const cause = 'String Error';
        // @ts-expect-error
        const e = new ErrorWithCause_1.ErrorWithCause('test message', { cause });
        expect(e.message).toBe('test message');
        expect(e.cause).toBe(cause);
        // Check that TypeScript sees e.cause as a string so there's no type error
        // @ts-expect-error
        expect(e.cause.toLowerCase()).toBe('string error');
    });
    it('should ignore unknown properties in options object', () => {
        const cause = new TypeError('cause');
        const e = new ErrorWithCause_1.ErrorWithCause('test message', { cause, details: { arg1: 'foo' } });
        expect(e.message).toBe('test message');
        expect(e.cause).toBe(cause);
        expect(Object.getOwnPropertyNames(e)).toStrictEqual(['stack', 'message', 'name', 'cause']);
    });
});
