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

  openCircuit() {
    if (this.isCircuitOpen && !this.isCircuitHalfOpen) {
      return;
    }
    this.isCircuitOpen = true;
    this.failedCallsCount = 0;

    this.isCircuitHalfOpen = false;
    this.circuitHalfOpenCallCount = 0;
    this.circuitHalfOpenCallSuccessCount = 0;
    clearInterval(this.circuitHalfOpenResetTimer);

    this.circuitOpenResetTimer = setTimeout(() => {
      this.isCircuitHalfOpen = true;
      this.circuitHalfOpenResetTimer = setTimeout(() => {
        console.log(
          "Closing Circuit as timout done during half open circuit succeded"
        );
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
    clearInterval(this.circuitHalfOpenResetTimer);
  }

  preFireRoutine() {
    this.totalCallsCount++;
    let isHalfOpenCheckCall = false;
    if (this.isCircuitOpen) {
      if (this.isCircuitHalfOpen) {
        this.circuitHalfOpenCallCount++;
        isHalfOpenCheckCall = true;
        if (
          this.circuitHalfOpenCallCount >
          config.HALF_OPEN_ALLOWED_CONNECTION_COUNT
        ) {
          this.totalFailedCallsCount++;
          throw new Error("Downstream requests are half open, checking.");
        }
      } else {
        this.totalFailedCallsCount++;
        throw new Error("Downstream is unresponsive, Try after sometime.");
      }
    }
    return isHalfOpenCheckCall;
  }

  postFireSuccessRoutine(isHalfOpenCheckCall) {
    this.totalSuccessCallsCount++;
    if (this.isCircuitHalfOpen && isHalfOpenCheckCall) {
      this.circuitHalfOpenCallSuccessCount++;
      console.log(
        "Test call during half open circuit succeeded",
        this.circuitHalfOpenCallSuccessCount
      );
      if (
        this.circuitHalfOpenCallSuccessCount >=
        config.HALF_OPEN_ALLOWED_CONNECTION_COUNT
      ) {
        console.log(
          "Closing Circuit as test calls during half open circuit succeded"
        );
        this.closeCircuit();
      }
    }
  }

  postFireFailureRoutine(isHalfOpenCheckCall) {
    this.totalFailedCallsCount++;
    if (this.isCircuitHalfOpen && isHalfOpenCheckCall) {
      console.log("opening circuit due to failure during half open test call");
      this.openCircuit();
      return;
    }
    this.failedCallsCount++;
    if (this.failedCallsCount >= config.FAILURE_THRESHOLD) {
      console.log("opening circuit due to threshold cross");
      this.openCircuit();
    }
  }

  async fire(...params) {
    const isHalfOpenCheckCall = this.preFireRoutine();

    try {
      const resp = await this._action(...params);
      this.postFireSuccessRoutine(isHalfOpenCheckCall);
      return resp;
    } catch (e) {
      this.postFireFailureRoutine(isHalfOpenCheckCall);
      throw e;
    }
  }

  showStatistics() {
    console.log(
      `Total calls: ${this.totalCallsCount} \t\t | Total Successful Calls: ${this.totalSuccessCallsCount} \t\t | Total Failures: ${this.totalFailedCallsCount}`
    );
  }
}

module.exports = CircuitBreaker;
