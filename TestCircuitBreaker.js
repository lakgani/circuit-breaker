const CircuitBreaker = require("./CircuitBreaker");
const action = require("./action");

const cb = new CircuitBreaker(action);

let callCount = 0;

const timer = setInterval(() => {
  if (callCount >= 1000) {
    clearInterval(timer);
  }
  callCount++;

  cb.fire()
    .then((resp) => {
      console.log(`call for instance ${callCount} completed successfully`);
    })
    .catch((e) => {
      console.log(
        `call for instance ${callCount} failed with error`,
        e.message
      );
    });
}, 1000);
