const HDWalletProvider = require('truffle-hdwallet-provider');
const NonceTrackerSubprovider = require("web3-provider-engine/subproviders/nonce-tracker");
const config = require('./config/env');

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*'
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(
          config.get('ropstenMnemonic'),
          `https://ropsten.infura.io/${ config.get('infuraApiKey') }`, 0, 10);
      },
      network_id: 3,
      gas: config.get('ropstenGasLimit'),
      gasPrice: config.get('ropstenGasPrice')
    },
    mainnet: {
      provider: function() {
        let wallet = new HDWalletProvider(
          config.get('mainnetMnemonic'),
          `https://mainnet.infura.io/${ config.get('infuraApiKey') }`, 0, 10);

        let nonceTracker = new NonceTrackerSubprovider();

        wallet.engine._providers.unshift(nonceTracker);

        nonceTracker.setEngine(wallet.engine);

        return wallet;
      },
      network_id: 1,
      gas: config.get('mainnetGasLimit'),
      gasPrice: config.get('mainnetGasPrice')
    },
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  mocha: {
    /*
    // Gas estimation
    reporter: 'eth-gas-reporter',
    reporterOptions : {
      currency: 'USD',
      gasPrice: 5
    }
    */
  }
};
