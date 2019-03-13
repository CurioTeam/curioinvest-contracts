# CurioInvest contracts

> Smart-contracts of CurioInvest project.

With using [Truffle framework](http://truffleframework.com/). Powered by [Ethereum](https://ethereum.org/).  
  
### CurioFerrariToken

Token represents shares of Ferrari F12tdf car. Number of shares equal car price in USD.

- ERC20 interface
- 18 decimals
- 1100000 total supply
  
### CurioFerrariGarageNFT

Represents unique car-tokens of Curio garage.

- ERC721 interface
- 1 NFT token represents 1 ERC20 car-token (include address and car name as token URI)
- Owner of contract can mint new tokens, transfer tokens to new car owner
  
### CurioFerrariCrowdsale

Allows to purchase CurioFerrariTokens for accepted stable tokens (e.g. TrueUSD, or DAI).

- Purchase tokens for others tokens
- Buy out all tokens (even those that were bought by other investors) with the payment of investors rewards
- Refund if the goal was not reached
- Post-delivery logic
- Timed logic
- Whitelisted logic
  
## Usage

### Requirements  

- Linux
- Node v10.14.1, NPM v6.9.0

### Install

```
npm i
```

### Configure

Create file ```<netName>.json``` in ```config/params``` directory. Fill out the config as in ```config/params/example.json```.

netNames:

```json
[
  "development",
  "ropsten",
  "mainnet"
]
```

##### Parameters

1. ```openingTime``` - Crowdsale opening time;  
2. ```closingTime``` - Crowdsale closing time;  
3. ```wallet``` - Address where collected funds will be forwarded to;  
4. ```acceptedToken``` - Address of the accepted token (stable token);  
5. ```rate``` - Number of token units a buyer gets per accepted token's unit;  
6. ```goal``` - Raise goal in accepted token units (soft and hard cap);  
7. ```rewardsPercent``` -  Percent of investor's rewards after all tokens purchased (0-10,000).  

### Deploy

##### 1. Compile contracts

```
truffle compile
```

##### 2. Deploy contracts

```
truffle migrate --network <netName> --reset
```

netNames:

```json
[
  "development",
  "ropsten",
  "mainnet"
]
```

##### 3. Init contracts

1. Transfer tokens to crowdsale contract  
2. Mint one NFT for Ferrari F12tdf

```
truffle exec scripts/init.js --network <netName>
```

Configurations in config/\<netName>.json files.

##### 4. View deployed contracts info

```
truffle exec scripts/info.js --network <netName>
```


