const CircuitBreaker = require("./CircuitBreaker");
const CircuitBreakerConfig = require("./CircuitBreakerConfig");

const delayedPromiseResolver = () =>
  new Promise((resolve) =>
    setTimeout(() => resolve("success"), Math.floor(Math.random() * 10) * 10)
  );
const delayedPromiseRejecter = () =>
  new Promise((resolve, reject) =>
    setTimeout(() => reject("failed"), Math.floor(Math.random() * 10) * 10)
  );

describe("CircuitBreaker", () => {
  it("should reflect the action function return status on start", async () => {
    const actionMock = jest
      .fn()
      .mockImplementationOnce(delayedPromiseResolver)
      .mockImplementationOnce(delayedPromiseRejecter)
      .mockImplementationOnce(delayedPromiseResolver)
      .mockImplementationOnce(delayedPromiseRejecter);

    const cb = new CircuitBreaker(actionMock);

    await Promise.all([
      expect(cb.fire()).resolves.toBe("success"),
      expect(cb.fire()).rejects.toBe("failed"),
    ]);
    jest.useFakeTimers();
    jest.advanceTimersByTime(
      CircuitBreakerConfig.CIRCUIT_OPEN_PERIOD +
        CircuitBreakerConfig.CIRCUIT_HALF_OPEN_PERIOD
    );
    const resp1 = cb.fire();
    jest.runAllTimers();
    await expect(resp1).resolves.toBe("success");

    const resp2 = cb.fire();
    jest.runAllTimers();
    await expect(resp2).rejects.toBe("failed");
  });

  it("should open circuit if action fails over a threshold", async () => {
    jest.useFakeTimers();
    const actionMock = jest.fn().mockImplementation(delayedPromiseRejecter);
    const cb = new CircuitBreaker(actionMock);

    const promises = Promise.all(
      Array(CircuitBreakerConfig.FAILURE_THRESHOLD)
        .fill()
        .map(() => expect(cb.fire()).rejects.toBe("failed"))
    );

    jest.runAllTimers();
    await promises;

    await expect(cb.fire()).rejects.toEqual(
      new Error("Downstream is unresponsive, Try after sometime.")
    );
  });

  it("should allow only certain no of calls during half open circuit", async () => {
    jest.useFakeTimers();
    const actionMock = jest.fn().mockImplementation(delayedPromiseRejecter);
    const cb = new CircuitBreaker(actionMock);

    const failurePromises = Promise.all(
      Array(CircuitBreakerConfig.FAILURE_THRESHOLD)
        .fill()
        .map(() => expect(cb.fire()).rejects.toBe("failed"))
    );

    jest.runAllTimers();
    await failurePromises;

    actionMock.mockResolvedValue("success");
    jest.advanceTimersByTime(CircuitBreakerConfig.CIRCUIT_OPEN_PERIOD + 1);

    const halfOpenChecks = Promise.all(
      Array(CircuitBreakerConfig.HALF_OPEN_ALLOWED_CONNECTION_COUNT)
        .fill()
        .map(() => expect(cb.fire()).resolves.toBe("success"))
    );
    await expect(cb.fire()).rejects.toEqual(
      new Error("Downstream requests are half open, checking.")
    );
    await halfOpenChecks;
  });

  it("should close circuit when none of the action fails during half open circuit", async () => {
    jest.useFakeTimers();
    const actionMock = jest.fn().mockImplementation(delayedPromiseRejecter);
    const cb = new CircuitBreaker(actionMock);

    const failurePromises = Promise.all(
      Array(CircuitBreakerConfig.FAILURE_THRESHOLD)
        .fill()
        .map(() => expect(cb.fire()).rejects.toBe("failed"))
    );

    jest.runAllTimers();
    await failurePromises;

    actionMock.mockResolvedValue("success");
    jest.advanceTimersByTime(CircuitBreakerConfig.CIRCUIT_OPEN_PERIOD + 1);

    const halfOpenChecks = Promise.all(
      Array(CircuitBreakerConfig.HALF_OPEN_ALLOWED_CONNECTION_COUNT)
        .fill()
        .map(() => expect(cb.fire()).resolves.toBe("success"))
    );
    await halfOpenChecks;
    await expect(cb.fire()).resolves.toBe("success");
  });
});

it("should open circuit when any action fails during half open circuit", async () => {
  jest.useFakeTimers();
  const actionMock = jest.fn().mockImplementation(delayedPromiseRejecter);
  const cb = new CircuitBreaker(actionMock);

  const failurePromises = Promise.all(
    Array(CircuitBreakerConfig.FAILURE_THRESHOLD)
      .fill()
      .map(() => expect(cb.fire()).rejects.toBe("failed"))
  );

  jest.runAllTimers();
  await failurePromises;

  jest.advanceTimersByTime(CircuitBreakerConfig.CIRCUIT_OPEN_PERIOD + 1);

  actionMock.mockRejectedValue("failed");
  await expect(cb.fire()).rejects.toBe("failed");

  actionMock.mockResolvedValue("success");
  await expect(cb.fire()).rejects.toEqual(
    new Error("Downstream is unresponsive, Try after sometime.")
  );
});

it("should close circuit when no calls happen during half open circuit", async () => {
  jest.useFakeTimers();
  const actionMock = jest.fn().mockImplementation(delayedPromiseRejecter);
  const cb = new CircuitBreaker(actionMock);

  const failurePromises = Promise.all(
    Array(CircuitBreakerConfig.FAILURE_THRESHOLD)
      .fill()
      .map(() => expect(cb.fire()).rejects.toBe("failed"))
  );

  jest.runAllTimers();
  await failurePromises;

  jest.advanceTimersByTime(
    CircuitBreakerConfig.CIRCUIT_OPEN_PERIOD +
      CircuitBreakerConfig.CIRCUIT_HALF_OPEN_PERIOD
  );

  actionMock.mockResolvedValue("success");
  await expect(cb.fire()).resolves.toBe("success");
});
