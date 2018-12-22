module.exports = {
  sleep: function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  printTxInfo: function (tx, msg) {
    if (msg) {
      console.log(msg);
    }

    console.log(`..${ tx.tx }`);
    console.log(`used gas ${ tx.receipt.gasUsed }`);
  }
};

