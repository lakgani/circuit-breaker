const FAILURE_THRESHOLD = 10;
const COOLDOWN_PERIOD = 2000;

class CircuitBreaker {
  constructor(action) {
    this._action = action;
    this.isDownstreamAvailable = true;
    this.totalFailedCallsCount = 0;
    this.failedCallsCount = 0;
    this.cooldownTimer = null;
  }

  handleFailure() {
    this.totalFailedCallsCount++;
    this.failedCallsCount++;
    this.showStatistics();
    if (this.failedCallsCount > FAILURE_THRESHOLD) {
      this.isDownstreamAvailable = false;
      this.resetAfterCooldown();
    }
  }

  resetAfterCooldown() {
    if (this.cooldownTimer) {
      return;
    }
    this.cooldownTimer = setTimeout(() => {
      this.failedCallsCount = 0;
      this.isDownstreamAvailable = true;
      this.cooldownTimer = null;
      console.log("Cooldown period completed");
    }, COOLDOWN_PERIOD);
  }

  async fire(...params) {
    if (!this.isDownstreamAvailable) {
      throw new Error("Downstream is unresponsive, Try after sometime.");
    }
    try {
      return await this._action(...params);
    } catch (e) {
      this.handleFailure();
      throw e;
    }
  }

  showStatistics() {
    console.log(
      `Total Failures: ${this.totalFailedCallsCount} \t\t | Current period Failures: ${this.failedCallsCount}  \t\t | Downstream available: ${this.isDownstreamAvailable}`
    );
  }
}

module.exports = CircuitBreaker;
