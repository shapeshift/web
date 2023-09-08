"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const createErrorClass_1 = require("./createErrorClass");
describe('createErrorClass', () => {
    it('should create a new Error based on ErrorWithDetails', () => {
        const TestError = (0, createErrorClass_1.createErrorClass)('TestError');
        expect(TestError).toBeInstanceOf(Function);
        expect((0, util_1.inspect)(TestError)).toBe('[class TestError extends ErrorWithDetails]');
        expect(new TestError('message')).toBeInstanceOf(TestError);
    });
    it('should create a new Error with typed details', () => {
        const TestError = (0, createErrorClass_1.createErrorClass)('TestError');
        expect(TestError).toBeInstanceOf(Function);
        expect(new TestError('message', { details: { prop: true } })).toBeInstanceOf(TestError);
    });
    it('should create a new Error with cause', () => {
        const TestError = (0, createErrorClass_1.createErrorClass)('TestError');
        const err = new TestError('message', { cause: { prop: true } });
        expect(err).toBeInstanceOf(TestError);
        expect(err.cause).toStrictEqual({ prop: true });
    });
    it('should create a new Error with cause and details', () => {
        const TestError = (0, createErrorClass_1.createErrorClass)('TestError');
        const err = new TestError('message', { details: { prop: true }, cause: new Error('test') });
        expect(err).toBeInstanceOf(TestError);
        expect(err.cause).toBeInstanceOf(Error);
        expect(err.cause.message).toBe('test');
        expect(err.details?.prop).toBe(true);
    });
    it('should create a new Error with a default error code based on the error name', () => {
        const E = (0, createErrorClass_1.createErrorClass)('TestError');
        const err = new E('test');
        expect(err.code).toBe('ERR_TEST');
    });
});
