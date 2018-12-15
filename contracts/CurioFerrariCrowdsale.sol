pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./crowdsale/validation/WhitelistCrowdsale.sol";
import "./crowdsale/validation/PausableCrowdsale.sol";
import "./crowdsale/validation/TimedCrowdsale.sol";

/**
* @title CurioFerrariCrowdsale
* @dev This is an example of a fully fledged crowdsale.
*/
// TODO: use ReentrancyGuard
// TODO: add received tokens and its rates
// TODO: timed
// TODO: refundable. add custom FinalizableCrowdsale (when goal reached)
contract CurioFerrariCrowdsale is WhitelistCrowdsale, PausableCrowdsale, TimedCrowdsale {
  constructor (
    uint256 openingTime,
    uint256 closingTime,
    address wallet,
    IERC20 token
  )
    public
    Crowdsale(wallet, token)
    TimedCrowdsale(openingTime, closingTime)
  {

  }
}
