function action() {
  const randVal = Math.floor(Math.random() * 10);
  return new Promise((res, rej) => {
    setTimeout(() => {
      if (randVal % 2 === 0) {
        res("success");
      } else {
        rej(`Failed due to randVal ${randVal}`);
      }
    }, randVal);
  });
}

module.exports = action;