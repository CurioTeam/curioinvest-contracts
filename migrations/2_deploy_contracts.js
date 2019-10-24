// const moment = require('moment');

// const config = require('../config/params');

const CarToken1 = artifacts.require('./CarToken1.sol');
const CurioGarageNFT = artifacts.require('./CurioGarageNFT.sol');

/*
const CarTokenCrowdsale = artifacts.require('./CarTokenCrowdsale.sol');
const TestStableToken = artifacts.require('./TestStableToken.sol');
*/

const BN = web3.utils.BN;

module.exports = function(deployer, network, accounts) {
  const owner = accounts[0];

  /*
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
      acceptedToken: deployParams.acceptedToken,
      rate: deployParams.rate, // for 18 decimals tokens: rate = 1
      goal: web3.utils.toWei(deployParams.goal), // for 18 decimals tokens
      rewardsPercent: parseFloat(deployParams.rewardsPercent) * 100,
    }
  };

  if(params.crowdsale.wallet === ""){
    params.crowdsale.wallet = accounts[2];
  }
  */

  /*
  deployer.deploy(CarToken1, { from: owner })
    .then(() => net !== 1 ? deployer.deploy(TestStableToken, {from: owner}) : true)
    .then(() => deployer.deploy(CarTokenCrowdsale,
                                params.crowdsale.openingTime,
                                params.crowdsale.closingTime,
                                params.crowdsale.wallet,
                                CarToken1.address,
                                net !== 1 ? TestStableToken.address : params.crowdsale.acceptedToken,
                                params.crowdsale.rate,
                                params.crowdsale.goal,
                                params.crowdsale.rewardsPercent,
                                { from: owner }))
    .then(() => deployer.deploy(CurioGarageNFT, { from: owner }));
  */

  deployer.deploy(CurioGarageNFT, { from: owner })
    .then(() => deployer.deploy(CarToken1, { from: owner }))
    .then(async () => {
      const nft = await CurioGarageNFT.deployed();

      console.log("CurioGarageNFT: " + CurioGarageNFT.address);
      console.log("CarToken1(CT1): " + CarToken1.address);

      console.log("Minting NFT for CT1 token..");

      await nft.mintWithTokenURI(
        owner, new BN(1), `CT1:${ CarToken1.address }`,
        { from: owner }
      );
    });
};
