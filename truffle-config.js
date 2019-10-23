const HDWalletProvider = require('truffle-hdwallet-provider');
const config = require('./config/env');

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: '*'
    },
    ropsten: {
      provider() {
        return new HDWalletProvider(
          config.get('ropstenMnemonic'),
          `https://ropsten.infura.io/v3/${config.get('infuraProjectId')}`,
          0,
          10,
        );
      },
      network_id: 3,
      gas: config.get('ropstenGasLimit'),
      gasPrice: config.get('ropstenGasPrice'),
    },
    mainnet: {
      provider() {
        return new HDWalletProvider(
          config.get('mainnetMnemonic'),
          `https://mainnet.infura.io/v3/${config.get('infuraProjectId')}`,
          0,
          10,
        );
      },
      network_id: 1,
      gas: config.get('mainnetGasLimit'),
      gasPrice: config.get('mainnetGasPrice'),
    },
  },
  compilers: {
    solc: {
      version: '0.5.12',
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    },
  },
};
