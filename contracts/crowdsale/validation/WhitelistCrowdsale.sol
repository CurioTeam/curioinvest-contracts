pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "../Crowdsale.sol";
import "../../access/Roles.sol";

/**
 * @title WhitelistCrowdsale
 * @dev Crowdsale in which only whitelisted users can contribute.
 */
contract WhitelistCrowdsale is Roles, Crowdsale {
  mapping (address => bool) private _whitelist;

  /**
   * @dev Reverts if msg.sender is not whitelisted.
   */
  modifier onlyWhitelisted() {
    require(isWhitelisted(msg.sender));
    _;
  }

  function isWhitelisted(address account) public view returns (bool) {
    return _whitelist[account];
  }


  /**
   * @dev Adds single address to whitelist.
   * @param account Address to be added to the whitelist
   */
  function addToWhitelist(address account) external onlyAdmin {
    _whitelist[account] = true;
  }

  /**
   * @dev Adds list of addresses to whitelist. Not overloaded due to limitations with truffle testing.
   * @param accounts Addresses to be added to the whitelist
   */
  function addManyToWhitelist(address[] accounts) external onlyAdmin {
    for (uint256 i = 0; i < accounts.length; i++) {
      _whitelist[accounts[i]] = true;
    }
  }

  /**
   * @dev Removes single address from whitelist.
   * @param account Address to be removed to the whitelist
   */
  function removeFromWhitelist(address account) external onlyAdmin {
    _whitelist[account] = false;
  }

  /**
  * @dev Extend parent behavior requiring beneficiary to be whitelisted. Note that no
  * restriction is imposed on the account sending the transaction.
  */
  function _preValidatePurchase(IERC20 tokenAddress, uint256 amount, address beneficiary) internal view {
    require(isWhitelisted(beneficiary));
    super._preValidatePurchase(tokenAddress, amount, beneficiary);
  }
}

