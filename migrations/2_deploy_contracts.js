const moment = require('moment');
const Web3 = require('web3');

let CurioFerrariToken = artifacts.require('./CurioFerrariToken.sol'),
    CurioFerrariCrowdsale = artifacts.require('./CurioFerrariCrowdsale.sol');

// Use web3 version 1.0
const web3 = new Web3(this.web3.currentProvider);
const BN = web3.utils.BN;

let params = {
  crowdsale: {
    openingTime: moment.utc("2019-01-01 00:00:00").unix(), // ISO 8601
    closingTime: moment.utc("2019-03-31 23:59:59").unix(), // ISO 8601
    wallet: '',
    saleGoal: new BN('890000e18'),
  }
};

module.exports = function(deployer, network, accounts) {
  const owner = accounts[0];

  params.crowdsale.wallet = accounts[2];

  deployer.deploy(CurioFerrariToken, { from: owner})
    .then(() => deployer.deploy(CurioFerrariCrowdsale,
                                params.crowdsale.openingTime,
                                params.crowdsale.closingTime,
                                params.crowdsale.wallet,
                                CurioFerrariToken.address,
                                params.crowdsale.saleGoal,
                                { from: owner }));
};
