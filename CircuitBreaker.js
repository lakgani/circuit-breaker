class CircuitBreaker {

    constructor(action) {
        this.action = action;
    }

    fire(...params) {
        return this.action(...params);
    }

}


module.exports = CircuitBreaker;