"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
describe('Logger', () => {
    it('should export loggerFactory', () => {
        expect(index_1.loggerFactory).toBeInstanceOf(Function);
        expect((0, index_1.loggerFactory)()).toBeInstanceOf(index_1.Logger);
    });
    it('should export Logger', () => {
        expect(index_1.Logger).toBeInstanceOf(Function);
    });
    it('should export LogLevel', () => {
        expect(index_1.LogLevel.NONE).toBe('none');
    });
});
