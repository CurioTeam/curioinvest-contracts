const moment = require('moment');
const Web3 = require('web3');

const config = require('../config/params');

let CurioFerrariToken = artifacts.require('./CurioFerrariToken.sol'),
    CurioFerrariCrowdsale = artifacts.require('./CurioFerrariCrowdsale.sol'),
    TestStableToken = artifacts.require('./TestStableToken.sol');

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
    let testStableToken = await TestStableToken.deployed();
    console.log("TestStableToken: " + TestStableToken.address);
  }

  console.log("Owner-deployer account: " + ownerAccount);
  console.log("-----");

  let owner = await crowdsale.owner();
  console.log("Owner: " + owner);

  let admin = await crowdsale.admin();
  console.log("Admin: " + admin);

  let wallet = await crowdsale.wallet();
  console.log("Wallet: " + wallet);

  let tokenAddress = await crowdsale.token();
  console.log("Token: " + tokenAddress);

  let acceptedTokenAddress = await crowdsale.acceptedToken();
  console.log("Accepted token: " + acceptedTokenAddress);

  let openingTime = await crowdsale.openingTime();
  openingTime = moment.unix(openingTime).utc().format("DD MMMM YYYY HH:mm");
  console.log("Opening time: " + openingTime);

  let closingTime = await crowdsale.closingTime();
  closingTime = moment.unix(closingTime).utc().format("DD MMMM YYYY HH:mm");
  console.log("Closing time: " + closingTime);

  let goal = await crowdsale.goal();
  goal = web3.utils.fromWei(web3.utils.toBN(goal));
  console.log("Goal: " + goal + " stable tokens");

  let rewardsPercent = await crowdsale.rewardsPercent();
  rewardsPercent = web3.utils.toBN(rewardsPercent).toNumber() / 100;
  console.log("rewardsPercent: " + rewardsPercent + "%");

  let raised = await crowdsale.raised();
  raised = web3.utils.fromWei(web3.utils.toBN(raised));
  console.log("Raised: " + raised + " stable tokens");

  let goalReached = await crowdsale.goalReached();
  console.log("Goal reached: " + goalReached);

  let state = await crowdsale.state();
  console.log("State: " + state + "  // enum State { Active, Refunding, Rewarding, Closed }");

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
