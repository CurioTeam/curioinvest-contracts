const config = require('../config/params');

let CurioFerrariToken = artifacts.require('./CurioFerrariToken.sol'),
    CurioFerrariCrowdsale = artifacts.require('./CurioFerrariCrowdsale.sol'),
    TestStableToken = artifacts.require('./TestStableToken.sol'),
    CurioGarageNFT = artifacts.require('./CurioGarageNFT.sol');

const BN = web3.utils.BN;

const init = async function (network, accounts) {
  const ownerAccount = accounts[0];

  const params = config.get(network);

  console.log("-----");

  let token = await CurioFerrariToken.deployed();
  console.log("CurioFerrariToken: " + CurioFerrariToken.address);

  let crowdsale = await CurioFerrariCrowdsale.deployed();
  console.log("CurioFerrariCrowdsale: " + CurioFerrariCrowdsale.address);

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

  let beforeBalance = await token.balanceOf(CurioFerrariCrowdsale.address);
  beforeBalance = web3.utils.fromWei(web3.utils.toBN(beforeBalance));
  console.log("Before balance: " + beforeBalance + " tokens");

  console.log("..processing..");
  const totalSupply = await token.totalSupply();

  // Transfer all tokens to crowdsale contract
  await token.transfer(CurioFerrariCrowdsale.address, totalSupply, { from: ownerAccount });

  let afterBalance = await token.balanceOf(CurioFerrariCrowdsale.address);
  afterBalance = web3.utils.fromWei(web3.utils.toBN(afterBalance));
  console.log("After balance: " + afterBalance + " tokens");

  console.log("2. Mint one NFT for Ferrari F12tdf");
  console.log("..processing..");

  await nft.mintWithTokenURI(
    ownerAccount, new BN(1), `FerrariF12tdf:${ CurioFerrariToken.address }`,
    { from: ownerAccount }
  );

  console.log("..ok");
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
