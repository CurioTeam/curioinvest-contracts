#!/usr/bin/env bash

OUTPUT_DIR="build/flattened-contracts"

npx truffle-flattener contracts/CurioFerrariToken.sol --output "$OUTPUT_DIR/CurioFerrariToken.sol"
npx truffle-flattener contracts/CurioGarageNFT.sol --output "$OUTPUT_DIR/CurioGarageNFT.sol"
npx truffle-flattener contracts/CurioFerrariCrowdsale.sol --output "$OUTPUT_DIR/CurioFerrariCrowdsale.sol"
