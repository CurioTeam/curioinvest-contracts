pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./crowdsale/validation/WhitelistCrowdsale.sol";
import "./crowdsale/validation/PausableCrowdsale.sol";
import "./crowdsale/distribution/RefundablePostDeliveryCrowdsale.sol";

/**
* @title CurioFerrariCrowdsale
* @dev This is an example of a fully fledged crowdsale.
*/
contract CurioFerrariCrowdsale is WhitelistCrowdsale, PausableCrowdsale, RefundablePostDeliveryCrowdsale {
  constructor (
    uint256 openingTime,
    uint256 closingTime,
    address wallet,
    IERC20 token,
    uint256 saleGoal
  )
    public
    Crowdsale(wallet, token)
    TimedCrowdsale(openingTime, closingTime)
    RefundableCrowdsale(saleGoal)
  {

  }
}
