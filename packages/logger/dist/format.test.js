"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const format_1 = require("./format");
class RuntimeError extends Error {
}
class ErrorWithDetails extends Error {
}
describe('format(x: any)', () => {
    it('should format a string to a message', () => {
        expect((0, format_1.format)('asdf')).toStrictEqual({ message: 'asdf' });
    });
    it('should pass through an object', () => {
        expect((0, format_1.format)({ name: 'name' })).toStrictEqual({ name: 'name' });
    });
    it('should format a normal error', () => {
        const err = new RuntimeError('Some error');
        expect((0, format_1.format)(err)).toStrictEqual({
            error: {
                message: err.message,
                stack: expect.stringMatching(/_callCircusTest(?!_runTestsForDescribeBlock)/m),
                kind: 'RuntimeError',
            },
        });
    });
    it('should format an error with cause and details', () => {
        const err = new ErrorWithDetails('details');
        err.code = 'ERR_TEST';
        err.details = { foo: 'bar' };
        err.cause = new Error('cause');
        expect((0, format_1.format)(err)).toStrictEqual({
            error: {
                code: 'ERR_TEST',
                cause: {
                    error: {
                        message: 'cause',
                        stack: expect.stringMatching(/_callCircusTest(?!_runTestsForDescribeBlock)/m),
                        kind: 'Error',
                    },
                },
                details: { foo: 'bar' },
                message: err.message,
                stack: expect.stringMatching(/_callCircusTest(?!_runTestsForDescribeBlock)/m),
                kind: 'ErrorWithDetails',
            },
        });
    });
    it('should throw if provided an array', () => {
        expect(() => (0, format_1.format)([])).toThrowError(Error);
    });
    it.each([[undefined], [null], [0], [true], [new Date()], [/abc/]])('should return undefined for any other value', x => {
        expect((0, format_1.format)(x)).toBeUndefined();
    });
});
