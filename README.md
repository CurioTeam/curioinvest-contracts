# CurioInvest contracts

> Smart-contracts of CurioInvest project.

With using [Truffle framework](http://truffleframework.com/). Powered by [Ethereum](https://ethereum.org/).  
  
## Usage

### Requirements  

- Linux
- Node v10.14.1, NPM v6.4.1

### Install

```
npm i
```

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


