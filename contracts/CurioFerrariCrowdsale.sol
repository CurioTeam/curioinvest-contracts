pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./crowdsale/validation/WhitelistCrowdsale.sol";
import "./crowdsale/validation/PausableCrowdsale.sol";

/**
* @title CurioFerrariCrowdsale
* @dev This is an example of a fully fledged crowdsale.
*/
// TODO: use ReentrancyGuard
// TODO: add received tokens and its rates
// TODO: timed
// TODO: refundable
contract CurioFerrariCrowdsale is WhitelistCrowdsale, PausableCrowdsale {
  constructor (
    address wallet,
    IERC20 token
  )
    public
    Crowdsale(wallet, token)
  {

  }
}
