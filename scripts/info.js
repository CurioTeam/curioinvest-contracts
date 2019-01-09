const moment = require('moment');
const Web3 = require('web3');

const config = require('../config/params');

let CurioFerrariToken = artifacts.require('./CurioFerrariToken.sol'),
    CurioFerrariCrowdsale = artifacts.require('./CurioFerrariCrowdsale.sol'),
    TestDAI = artifacts.require('./TestDAI.sol'),
    TestTUSD = artifacts.require('./TestTUSD.sol');

// Use web3 version 1.0
const web3 = new Web3(this.web3.currentProvider);

const info = async function (network, accounts) {
  const ownerAccount = accounts[0];

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

  console.log("Owner-deployer account: " + ownerAccount);
  console.log("-----");

  let owner = await crowdsale.owner();
  console.log("Owner: " + owner);

  let admin = await crowdsale.admin();
  console.log("Admin: " + admin);

  let wallet = await crowdsale.wallet();
  console.log("Wallet: " + wallet);

  let openingTime = await crowdsale.openingTime();
  openingTime = moment.unix(openingTime).utc().format("DD MMMM YYYY HH:mm");
  console.log("Opening time: " + openingTime);

  let closingTime = await crowdsale.closingTime();
  closingTime = moment.unix(closingTime).utc().format("DD MMMM YYYY HH:mm");
  console.log("Closing time: " + closingTime);

  let saleGoal = await crowdsale.saleGoal();
  saleGoal = web3.utils.fromWei(web3.utils.toBN(saleGoal));
  console.log("Sale goal: " + saleGoal + " tokens");

  let tokensSold = await crowdsale.tokensSold();
  tokensSold = web3.utils.fromWei(web3.utils.toBN(tokensSold));
  console.log("Tokens sold: " + tokensSold + " tokens");

  let goalReached = await crowdsale.goalReached();
  console.log("Goal reached: " + goalReached);

  let state = await crowdsale.state();
  console.log("State: " + state + "  // enum State { Active, Refunding, Closed }");

  let paused = await crowdsale.paused();
  console.log("Paused: " + paused);

  let finalized = await crowdsale.finalized();
  console.log("Finalized: " + finalized);

  console.log("-----");
};

module.exports = async function () {
  const accounts = await web3.eth.getAccounts();
  const network = await web3.eth.net.getId();

  try {
    console.log("*** INFO script ***");
    await info(network, accounts);
  } catch (e) {
    console.log(e);
  }
};
