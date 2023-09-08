/// <reference types="node" />
type ValidationErrorDetails = {
    name: string;
    actual: unknown;
    expected: unknown;
};
export declare const ValidationError: {
    new <V extends {
        cause?: unknown;
        details?: ValidationErrorDetails | undefined;
        code?: string | undefined;
    }>(message?: string | undefined, options?: V | undefined): {
        details: (V extends {
            details: infer R;
        } ? R : undefined) | undefined;
        "__#48375@#code"?: string | undefined;
        code: string | undefined;
        readonly cause: V extends {
            cause: infer R_1;
        } ? R_1 : undefined;
        name: string;
        message: string;
        stack?: string | undefined;
    };
    captureStackTrace(targetObject: object, constructorOpt?: Function | undefined): void;
    prepareStackTrace?: ((err: Error, stackTraces: NodeJS.CallSite[]) => any) | undefined;
    stackTraceLimit: number;
};
export {};
