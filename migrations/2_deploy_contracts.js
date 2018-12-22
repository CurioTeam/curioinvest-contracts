const moment = require('moment');
const Web3 = require('web3');

const config = require('../config/params');

let CurioFerrariToken = artifacts.require('./CurioFerrariToken.sol'),
    CurioFerrariCrowdsale = artifacts.require('./CurioFerrariCrowdsale.sol');

// Use web3 version 1.0
const web3 = new Web3(this.web3.currentProvider);
const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts) {
  const owner = accounts[0];
  let net;

  switch (network) {
    case 'mainnet':
      net = 1;
      break;
    case 'ropsten':
      net = 3;
      break;
    default:
      net = 123;
  }

  const deployParams = config.get(net);

  let params = {
    crowdsale: {
      openingTime: moment.utc(deployParams.openingTime).unix(),
      closingTime: moment.utc(deployParams.closingTime).unix(),
      wallet: deployParams.wallet,
      saleGoal: web3.utils.toWei(deployParams.saleGoal),
    }
  };

  if(params.crowdsale.wallet === ""){
    params.crowdsale.wallet = accounts[2];
  }

  deployer.deploy(CurioFerrariToken, { from: owner })
    .then(() => deployer.deploy(CurioFerrariCrowdsale,
                                params.crowdsale.openingTime,
                                params.crowdsale.closingTime,
                                params.crowdsale.wallet,
                                CurioFerrariToken.address,
                                params.crowdsale.saleGoal,
                                { from: owner }));
};
