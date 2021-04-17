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
      console.log("opening circuit due to failure during half open test call");
      this.openCircuit();
      return;
    }
    if (this.failedCallsCount >= config.FAILURE_THRESHOLD) {
      console.log("opening circuit due to threshold cross");
      this.openCircuit();
    }
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
          this.totalFailedCallsCount++;
          throw new Error("Downstream requests are half open, checking.");
        }
      } else {
        this.totalFailedCallsCount++;
        throw new Error("Downstream is unresponsive, Try after sometime.");
      }
    }
    try {
      const resp = await this._action(...params);
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
