const CircuitBreaker = require("./CircuitBreaker");
const action = require("./action");

const cb = new CircuitBreaker(action);

let callCount = 0;
const cbPromises = [];

const timer = setInterval(() => {
  if (callCount >= 1000) {
    clearInterval(timer);
    Promise.allSettled(cbPromises).then(() => {
      cb.showStatistics();
    });
    return;
  }
  let currentIntance = callCount;
  callCount++;

  cbPromises.push(
    cb
      .fire()
      .then(() => {
        console.log(
          `call for instance ${currentIntance} completed successfully`
        );
      })
      .catch((e) => {
        console.log(
          `call for instance ${currentIntance} failed with error`,
          e.message
        );
      })
  );
}, 100);
