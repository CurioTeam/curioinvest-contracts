const moment = require('moment');
const Web3 = require('web3');

const config = require('../config/params');

let CurioFerrariToken = artifacts.require('./CurioFerrariToken.sol'),
    CurioFerrariCrowdsale = artifacts.require('./CurioFerrariCrowdsale.sol'),
    TestDAI = artifacts.require('./TestDAI.sol'),
    TestTUSD = artifacts.require('./TestTUSD.sol');

// Use web3 version 1.0
const BigNumber = this.web3.BigNumber;
const web3 = new Web3(this.web3.currentProvider);
const BN = web3.utils.BN;

const util = require('./utils/util');

const init = async function (network, accounts) {
  const ownerAccount = accounts[0];

  const params = config.get(network);

  console.log("-----");

  let token = await CurioFerrariToken.deployed();
  console.log("CurioFerrariToken: " + CurioFerrariToken.address);

  let crowdsale = await CurioFerrariCrowdsale.deployed();
  console.log("CurioFerrariCrowdsale: " + CurioFerrariCrowdsale.address);

  if(network !== 1) {
    let testDAI = await TestDAI.deployed();
    console.log("TestDAI: " + TestDAI.address);

    let testTUSD = await TestTUSD.deployed();
    console.log("TestTUSD: " + TestTUSD.address);
  }

  console.log("Owner-deployer address: " + ownerAccount);
  console.log("-----");

  console.log("1. Transfer " + params.saleGoal + " tokens to crowdsale contract..");

  let availableTokens = await token.balanceOf(ownerAccount);
  availableTokens = web3.utils.fromWei(web3.utils.toBN(availableTokens));
  console.log("Available tokens to transfer: " + availableTokens + " tokens");

  let beforeBalance = await token.balanceOf(CurioFerrariCrowdsale.address);
  beforeBalance = web3.utils.fromWei(web3.utils.toBN(beforeBalance));
  console.log("Before balance: " + beforeBalance + " tokens");

  console.log("..processing..");
  await token.transfer(CurioFerrariCrowdsale.address, web3.utils.toWei(params.saleGoal), { from: ownerAccount });

  let afterBalance = await token.balanceOf(CurioFerrariCrowdsale.address);
  afterBalance = web3.utils.fromWei(web3.utils.toBN(afterBalance));
  console.log("After balance: " + afterBalance + " tokens");

  console.log("2. Set accepted tokens");

  const testAcceptedTokens = {
    "Dai Stablecoin v1.0": TestDAI.address,
    "TrueUSD": TestTUSD.address,
  };

  for(let token of params.tokens) {
    let tokenAddress = network !== 1 ? testAcceptedTokens[token.name] : token.address;

    console.log(`- adding ${ token.name } (${ tokenAddress })`);
    console.log("..processing..");

    await crowdsale.addAcceptedToken(tokenAddress, token.name, token.rate, { from: ownerAccount });
  }
};

module.exports = async function () {
  const accounts = await web3.eth.getAccounts();
  const network = await web3.eth.net.getId();

  try {
    console.log("*** INIT script ***");

    await init(network, accounts);

    console.log("Init script end.");
  } catch (e) {
    console.log(e);
  }
};
