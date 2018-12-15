pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../Crowdsale.sol";
import "../../lifecycle/Pausable.sol";

/**
 * @title PausableCrowdsale
 * @dev Extension of Crowdsale contract where purchases can be paused and unpaused by the owner.
 */
contract PausableCrowdsale is Crowdsale, Pausable {

  /**
   * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met. Use super to concatenate validations.
   * Adds the validation that the crowdsale must not be paused.
   */
  function _preValidatePurchase(IERC20 tokenAddress, uint256 amount, address beneficiary) internal view whenNotPaused {
    return super._preValidatePurchase(tokenAddress, amount, beneficiary);
  }
}
