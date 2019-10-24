# CurioInvest contracts

> Smart-contracts of CurioInvest project.

With using [Truffle framework](http://truffleframework.com/). Powered by [Ethereum](https://ethereum.org/).  
  
### CarToken1

Token represents shares of Ferrari F12tdf car. Number of shares equal car price in USD.

- ERC20 interface
- 18 decimals
- 1100000 total supply
  
### CurioGarageNFT

Represents unique car-tokens of Curio garage.

- ERC721 interface
- 1 NFT token represents 1 ERC20 car-token (include address and car name as token URI)
- Owner of contract can mint new tokens, transfer tokens to new car owner
  
### CarTokenCrowdsale

Allows to purchase CarToken1 for accepted stable tokens (e.g. TrueUSD, or DAI).

- Purchase tokens for others tokens
- Buy out all tokens (even those that were bought by other investors) with the payment of investors rewards
- Refund if the goal was not reached
- Post-delivery logic
- Timed logic
- Whitelisted logic
  
## Usage

### Requirements  

- Linux (for run bash scripts)
- Node v10.14.1, NPM v6.9.0

### Install

```
npm i
```

### Compile contracts

```
npm run compile
```

### Run tests

Using local truffle develop network.

```
npx truffle develop

truffle(develop)> test
```

### Deploy

#### 1. Configure network parameters

Create file ```.env``` in root project directory. Fill out environment variables as in ```.env.example```.

##### Parameters:

1. ```INFURA_PROJECT_ID``` - Project ID for Infura provider;  
2. ```MAINNET_MNEMONIC``` - Mnemonic phrase of deployer wallets;  
3. ```MAINNET_GAS_LIMIT``` - Gas limit value;  
4. ```MAINNET_GAS_PRICE``` - Gas price value;  
5. ```ROPSTEN_MNEMONIC``` - Mnemonic phrase of deployer wallets (for Ropsten network);  
6. ```ROPSTEN_GAS_LIMIT``` - Gas limit value (for Ropsten network);  
7. ```ROPSTEN_GAS_PRICE``` - Gas price value (for Ropsten network);  

#### 2. Configure crowdsale parameters (for crowdsale contract deploying)

Create file ```<netName>.json``` in ```config/params``` directory. Fill out the config as in ```config/params/example.json```.

netNames:

```json
[
  "development",
  "ropsten",
  "mainnet"
]
```

##### Parameters:

1. ```openingTime``` - Crowdsale opening time;  
2. ```closingTime``` - Crowdsale closing time;  
3. ```wallet``` - Address where collected funds will be forwarded to;  
4. ```acceptedToken``` - Address of the accepted token (stable token);  
5. ```rate``` - Number of token units a buyer gets per accepted token's unit;  
6. ```goal``` - Raise goal in accepted token units (soft and hard cap);  
7. ```rewardsPercent``` -  Percent of investor's rewards after all tokens purchased (0-10,000).  


#### 3. Compile contracts

```
npx truffle compile
```

#### 4. Deploy contracts

```
npx truffle migrate --network <netName> --reset
```

netNames:

```json
[
  "development",
  "ropsten",
  "mainnet"
]
```
