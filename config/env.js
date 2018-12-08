const path = require('path');
const dotenv = require('dotenv');
const convict = require('convict');

dotenv.config({
  path: path.resolve(__dirname, '..', '.env')
});

const config = convict({
  infuraApiKey: {
    doc: 'Infura API key.',
    format: '*',
    default: '',
    env: 'INFURA_API_KEY'
  },
  ropstenMnemonic: {
    doc: 'Mnenonic phrase (12 words) for Ropsten test network.',
    format: '*',
    default: '',
    env: 'ROPSTEN_MNEMONIC'
  },
  ropstenGasLimit: {
    doc: 'Gas limit for Ropsten test network.',
    format: '*',
    default: '4000000',
    env: 'ROPSTEN_GAS_LIMIT'
  },
  ropstenGasPrice: {
    doc: 'Gas price for Ropsten test network.',
    format: '*',
    default: '100000000000',
    env: 'ROPSTEN_GAS_PRICE'
  },
  mainnetMnemonic: {
    doc: 'Mnenonic phrase (12 words) for Main Ethereum network.',
    format: '*',
    default: '',
    env: 'MAINNET_MNEMONIC'
  },
  mainnetGasLimit: {
    doc: 'Gas limit for main Ethereum network.',
    format: '*',
    default: '4000000',
    env: 'MAINNET_GAS_LIMIT'
  },
  mainnetGasPrice: {
    doc: 'Gas price for main Ethereum network.',
    format: '*',
    default: '5000000000',
    env: 'MAINNET_GAS_PRICE'
  },
});

config.validate({ allowed: 'strict' });

module.exports = config;
