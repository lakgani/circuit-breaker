const config = require("./CircuitBreakerConfig");

class CircuitBreaker {
  constructor(action) {
    this._action = action;
    this.totalCallsCount = 0;
    this.totalSuccessCallsCount = 0;
    this.totalFailedCallsCount = 0;

    this.failedCallsCount = 0;
    this.isCircuitOpen = false;
    this.circuitOpenResetTimer = null;

    this.circuitHalfOpenCallCount = 0;
    this.circuitHalfOpenCallSuccessCount = 0;
    this.circuitHalfOpenResetTimer = null;
    this.isCircuitHalfOpen = false;
  }

  handleFailure() {
    this.totalFailedCallsCount++;
    this.failedCallsCount++;
    // this.showStatistics();
    if (this.isCircuitHalfOpen) {
      this.openCircuit();
      return;
    }
    if (this.failedCallsCount >= config.FAILURE_THRESHOLD) {
      this.openCircuit();
    }
  }

  openCircuit() {
    if (this.isCircuitOpen && !this.isCircuitHalfOpen) {
      return;
    }
    this.isCircuitOpen = true;
    this.isCircuitHalfOpen = false;
    this.circuitHalfOpenCallCount = 0;
    this.circuitHalfOpenCallSuccessCount = 0;

    this.circuitOpenResetTimer = setTimeout(() => {
      this.isCircuitHalfOpen = true;
      this.circuitHalfOpenResetTimer = setTimeout(() => {
        this.closeCircuit();
      }, config.CIRCUIT_HALF_OPEN_PERIOD);
    }, config.CIRCUIT_OPEN_PERIOD);
  }

  closeCircuit() {
    this.isCircuitOpen = false;
    this.failedCallsCount = 0;

    this.isCircuitHalfOpen = false;
    this.circuitHalfOpenCallCount = 0;
    this.circuitHalfOpenCallSuccessCount = 0;
    clearTimeout(this.circuitHalfOpenResetTimer);
  }

  async fire(...params) {
    let isHalfOpenCheckCall = false;
    this.totalCallsCount++;
    if (this.isCircuitOpen) {
      if (this.isCircuitHalfOpen) {
        this.circuitHalfOpenCallCount++;
        isHalfOpenCheckCall = true;
        if (
          this.circuitHalfOpenCallCount >
          config.HALF_OPEN_ALLOWED_CONNECTION_COUNT
        ) {
          throw new Error("Downstream requests are half open, checking.");
        }
      } else {
        throw new Error("Downstream is unresponsive, Try after sometime.");
      }
    }
    try {
      const resp = await this._action(...params);
      this.totalSuccessCallsCount++;
      if (isHalfOpenCheckCall) {
        this.circuitHalfOpenCallSuccessCount++;
        if (
          this.circuitHalfOpenCallSuccessCount >=
          config.HALF_OPEN_ALLOWED_CONNECTION_COUNT
        ) {
          this.closeCircuit();
        }
      }
      return resp;
    } catch (e) {
      this.handleFailure();
      throw e;
    }
  }

  showStatistics() {
    console.log(
      `Total calls: ${this.totalCallsCount} \t\t | Total Successful Calls: ${this.totalSuccessCallsCount} \t\t | Total Failures: ${this.totalFailedCallsCount}`
    );
    console.log(
      `Current period Failures: ${this.failedCallsCount}  \t\t | Circuit Open: ${this.isCircuitOpen}`
    );
    console.log(
      `Circuit half open: ${this.isCircuitHalfOpen}  \t\t | Cicuit Half Open Calls: ${this.circuitHalfOpenCallCount} \t\t | Cicuit Half Open Calls Success: ${this.circuitHalfOpenCallSuccessCount}`
    );
  }
}

module.exports = CircuitBreaker;
