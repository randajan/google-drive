



export class RedirectError extends Error {

    static is(any) {
        return any instanceof RedirectError;
    }

    constructor(code, message, options) {
        super(message, options);
        this.code = code;
    }
}