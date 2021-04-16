const CircuitBreaker = require("./CircuitBreaker");
const action = require("./action");

const cb = new CircuitBreaker(action);

for (let i = 0; i < 10; i++) {
  cb.fire()
    .then((resp) => {
      console.log(`call for instance ${i} completed successfully`);
    })
    .catch((e) => {
      console.log(`call for instance ${i} failed with error`, e);
    });
}
