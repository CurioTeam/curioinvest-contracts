#!/usr/bin/env bash

OUTPUT_DIR="build/flattened-contracts"

npx truffle-flattener contracts/CarToken1.sol --output "$OUTPUT_DIR/CarToken1.sol"
npx truffle-flattener contracts/CurioGarageNFT.sol --output "$OUTPUT_DIR/CurioGarageNFT.sol"
npx truffle-flattener contracts/CarTokenCrowdsale.sol --output "$OUTPUT_DIR/CarTokenCrowdsale.sol"
