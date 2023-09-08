"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = void 0;
const ErrorHandler = async (err) => {
    if (err.isAxiosError) {
        throw new Error(JSON.stringify(err.response?.data));
    }
    else if (err.name === 'ResponseError') {
        // handle fetch api error coming from generated typescript client
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await err.response.json();
        throw new Error(JSON.stringify(response));
    }
    else if (err instanceof Error) {
        throw err;
    }
    else if (typeof err == 'string') {
        throw new Error(err);
    }
    else {
        throw new Error(JSON.stringify(err));
    }
};
exports.ErrorHandler = ErrorHandler;
