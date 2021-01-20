class HttpError extends Error {
    constructor(message, errorCode) {
        super(message); //call parent contructor and add message
        this.code = errorCode;
    }
}

module.exports = HttpError;