export declare class ErrorWithCause<T extends {
    cause?: unknown;
} | undefined = undefined> extends Error {
    readonly cause: T extends {
        cause: infer R;
    } ? R : undefined;
    constructor(message?: string, options?: T);
}
