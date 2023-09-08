export declare const ForbiddenError: {
    new <V extends {
        cause?: unknown;
        details?: Record<string, unknown> | undefined;
        code?: string | undefined;
    }>(message?: string | undefined, options?: V | undefined): {
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
