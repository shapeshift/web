export declare function createErrorClass<T extends Record<string, unknown>, U extends {
    cause?: unknown;
    details?: T;
    code?: string;
} = {
    cause?: unknown;
    details?: T;
    code?: string;
}>(name: `${string}Error`): {
    new <V extends U>(message?: string, options?: V | undefined): {
        details: (V extends {
            details: infer R;
        } ? R : undefined) | undefined;
        "__#48405@#code"?: string | undefined;
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
