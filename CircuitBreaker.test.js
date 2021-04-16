const CircuitBreaker = require("./CircuitBreaker");
const CircuitBreakerConfig = require("./CircuitBreakerConfig");

describe("CircuitBreaker", () => {
  it("should reflect the action function return status on start", async () => {
    jest.useFakeTimers();
    const actionMock = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve("success"))
      .mockReturnValueOnce(Promise.reject("failed"))
      .mockReturnValueOnce(Promise.resolve("success"));
    const cb = new CircuitBreaker(actionMock);

    await expect(cb.fire()).resolves.toBe("success");
    await expect(cb.fire()).rejects.toBe("failed");
    jest.advanceTimersByTime(
      CircuitBreakerConfig.CIRCUIT_OPEN_PERIOD +
        CircuitBreakerConfig.CIRCUIT_HALF_OPEN_PERIOD
    );
    await expect(cb.fire()).resolves.toBe("success");
  });

  it("should open circuit if action fails over a threshold", async () => {
    const actionMock = jest.fn().mockReturnValue(Promise.reject("failed"));
    const cb = new CircuitBreaker(actionMock);

    for (let i = 0; i < 10; i++) {
      await expect(cb.fire()).rejects.toBe("failed");
    }

    await expect(cb.fire()).rejects.toEqual(
      new Error("Downstream is unresponsive, Try after sometime.")
    );
  });

  it("should allow only certain no of calls during half open circuit", async () => {
    jest.useFakeTimers();
    const actionMock = jest.fn().mockReturnValue(Promise.reject("failed"));
    const cb = new CircuitBreaker(actionMock);

    for (let i = 0; i < 10; i++) {
      await expect(cb.fire()).rejects.toBe("failed");
    }

    actionMock.mockReturnValue(Promise.resolve("success"));
    jest.advanceTimersByTime(CircuitBreakerConfig.CIRCUIT_OPEN_PERIOD);
    for (let i = 0; i < 4; i++) {
      await expect(cb.fire()).resolves.toBe("success");
    }
    await expect(cb.fire()).resolves.toBe("success");
  });
  it("should open circuit when any action fails during half open circuit", async () => {
    jest.useFakeTimers();
    const actionMock = jest.fn().mockReturnValue(Promise.reject("failed"));
    const cb = new CircuitBreaker(actionMock);
    for (let i = 0; i < 10; i++) {
      await expect(cb.fire()).rejects.toBe("failed");
    }

    jest.advanceTimersByTime(CircuitBreakerConfig.CIRCUIT_OPEN_PERIOD);
    await expect(cb.fire()).rejects.toBe("failed");

    await expect(cb.fire()).rejects.toEqual(
      new Error("Downstream is unresponsive, Try after sometime.")
    );
  });

  it("should close circuit when no calls happen during half open circuit", async () => {
    jest.useFakeTimers();
    const actionMock = jest.fn().mockReturnValue(Promise.reject("failed"));
    const cb = new CircuitBreaker(actionMock);
    for (let i = 0; i < 10; i++) {
      await expect(cb.fire()).rejects.toBe("failed");
    }

    jest.advanceTimersByTime(
      CircuitBreakerConfig.CIRCUIT_OPEN_PERIOD +
        CircuitBreakerConfig.CIRCUIT_HALF_OPEN_PERIOD
    );
    actionMock.mockReturnValue(Promise.resolve("success"));
    await expect(cb.fire()).resolves.toBe("success");
  });

  it("should close circuit when none of the action fails during half open circuit", async () => {
    jest.useFakeTimers();
    const actionMock = jest.fn().mockReturnValue(Promise.reject("failed"));
    const cb = new CircuitBreaker(actionMock);
    for (let i = 0; i < 10; i++) {
      await expect(cb.fire()).rejects.toBe("failed");
    }

    jest.advanceTimersByTime(CircuitBreakerConfig.CIRCUIT_OPEN_PERIOD);
    actionMock.mockReturnValue(Promise.resolve("success"));
    await expect(cb.fire()).resolves.toBe("success");
    jest.advanceTimersByTime(CircuitBreakerConfig.CIRCUIT_HALF_OPEN_PERIOD);
    await expect(cb.fire()).resolves.toBe("success");
  });
});
