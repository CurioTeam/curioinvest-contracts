const config = require('../config/params');

let CarToken1 = artifacts.require('./CarToken1.sol'),
    CarTokenCrowdsale = artifacts.require('./CarTokenCrowdsale.sol'),
    TestStableToken = artifacts.require('./TestStableToken.sol'),
    CurioGarageNFT = artifacts.require('./CurioGarageNFT.sol');

const BN = web3.utils.BN;

const initCt1Crowdsale = async function (network, accounts) {
  const ownerAccount = accounts[0];

  const params = config.get(network);

  console.log("-----");

  let token = await CarToken1.deployed();
  console.log("CarToken1: " + CarToken1.address);

  let crowdsale = await CarTokenCrowdsale.deployed();
  console.log("CarTokenCrowdsale: " + CarTokenCrowdsale.address);

  let nft = await CurioGarageNFT.deployed();
  console.log("CurioGarageNFT: " + CurioGarageNFT.address);

  if(network !== 1) {
    let testStableToken = await TestStableToken.deployed();
    console.log("TestStableToken: " + TestStableToken.address);
  }

  console.log("Owner-deployer address: " + ownerAccount);
  console.log("-----");

  console.log("1. Transfer " + params.goal + " tokens to crowdsale contract..");

  let availableTokens = await token.balanceOf(ownerAccount);
  availableTokens = web3.utils.fromWei(web3.utils.toBN(availableTokens));
  console.log("Available tokens to transfer: " + availableTokens + " tokens");

  let beforeBalance = await token.balanceOf(CarTokenCrowdsale.address);
  beforeBalance = web3.utils.fromWei(web3.utils.toBN(beforeBalance));
  console.log("Before balance: " + beforeBalance + " tokens");

  console.log("..processing..");
  const totalSupply = await token.totalSupply();

  // Transfer all tokens to crowdsale contract
  await token.transfer(CarTokenCrowdsale.address, totalSupply, { from: ownerAccount });

  let afterBalance = await token.balanceOf(CarTokenCrowdsale.address);
  afterBalance = web3.utils.fromWei(web3.utils.toBN(afterBalance));
  console.log("After balance: " + afterBalance + " tokens");
};

module.exports = async function () {
  const accounts = await web3.eth.getAccounts();
  const network = await web3.eth.net.getId();

  try {
    console.log("*** INIT crowdsale script ***");

    await initCt1Crowdsale(network, accounts);

    console.log("Init script end.");
  } catch (e) {
    console.log(e);
  }
};
