import { ErrorWithCause } from './ErrorWithCause';
export declare class ErrorWithDetails<T extends {
    cause?: unknown;
    details?: Record<string, unknown>;
    code?: string;
} | undefined = undefined> extends ErrorWithCause<T> {
    #private;
    details: (T extends {
        details: infer R;
    } ? R : undefined) | undefined;
    constructor(message?: string, options?: T);
    get code(): string | undefined;
    /**
     * Normalize error codes to uppercase + snake_case for consistency
     */
    set code(value: string | undefined);
}
