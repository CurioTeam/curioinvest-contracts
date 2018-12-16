pragma solidity ^0.4.24;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./FinalizableCrowdsale.sol";

/**
* @title RefundableCrowdsale
* @dev Extension of Crowdsale contract that adds a sale goal, and the possibility of users getting a refund if goal
* is not met.
*/
// TODO: add escrow in this contract
contract RefundableCrowdsale is FinalizableCrowdsale {
  using SafeMath for uint256;

  enum State { Active, Refunding, Closed }

  event RefundsClosed();
  event RefundsEnabled();
  event Deposited(address indexed payee, address indexed token, uint256 amount);
  event Withdrawn(address indexed payee, address indexed token, uint256 amount);

  State private _state;

  uint256 private _saleGoal;

  // _deposits[beneficiary][token] = amount
  mapping(address => mapping (address => uint256)) private _deposits;

  /**
   * @dev Constructor.
   * @param saleGoal Goal for sold tokens
   */
  constructor (uint256 saleGoal) internal {
    require(saleGoal > 0);
    // _escrow = new RefundEscrow(wallet());
    _saleGoal = saleGoal;
    _state = State.Active;
  }

  function saleGoal() public view returns (uint256) {
    return _saleGoal;
  }

  function state() public view returns (State) {
    return _state;
  }

  /**
   * @dev Investors can claim refunds here if crowdsale is unsuccessful
   * @param refundee Whose refund will be claimed.
   */
  function claimRefund(address refundee, IERC20 tokenContract) public {
    require(finalized());
    require(!goalReached());
    require(_state == State.Refunding);

    _withdraw(tokenContract, refundee);
  }

  /**
   * @dev Checks whether funding goal was reached.
   * @return Whether funding goal was reached
   */
  function goalReached() public view returns (bool) {
    return tokensSold() >= _saleGoal;
  }

  // override  _finalizationAvailable function in FinalizableCrowdsale
  function _finalizationAvailable() internal {
    require(hasClosed() || goalReached());
  }

  /**
   * @dev escrow finalization task, called when finalize() is called
   */
  function _finalization() internal {
    if (goalReached()) {
      _close();
    } else {
      _enableRefunds();
    }

    super._finalization();
  }

  /**
   * @dev Withdraws any tokens from this contract to wallet.
   * @param tokenContract The address of the token
   */
  function withdraw(IERC20 tokenContract) onlyOwnerOrAdmin external {
    require(_tokenContract != address(0));
    require(_state == State.Closed); // only goal reached!!! before - tokens frozen

    uint256 amount = tokenContract.balanceOf(address(this));
    tokenContract.transfer(wallet(), amount);
  }


  function depositsOf(address payee, IERC20 tokenContract) public view returns (uint256) {
    return _deposits[payee][tokenContract];
  }


  // -------------------------------------------
  // INTERNAL

  /**
     * @dev Allows for the beneficiary to withdraw their funds, rejecting
     * further deposits.
     */
  function _close() internal {
    require(_state == State.Active);
    _state = State.Closed;
    emit RefundsClosed();
  }

  /**
   * @dev Allows for refunds to take place, rejecting further deposits.
   */
  function _enableRefunds() internal {
    require(_state == State.Active);
    _state = State.Refunding;
    emit RefundsEnabled();
  }

  /**
  * @dev Stores the sent amount as credit to be withdrawn.
  * @param payee The destination address of the funds.
  */
  function _deposit(IERC20 tokenAddress, uint256 amount, address payee) internal {
    _deposits[payee][tokenAddress] = _deposits[payee][tokenAddress].add(amount);

    emit Deposited(payee, tokenAddress, amount);
  }

  /**
  * @dev Withdraw accumulated balance for a payee.
  * @param payee The address whose funds will be withdrawn and transferred to.
  */
  function _withdraw(IERC20 tokenAddress, address payee) internal {
    uint256 payment = _deposits[payee][tokenAddress];

    _deposits[payee][tokenAddress] = 0;

    tokenAddress.transfer(payee, payment);

    emit Withdrawn(payee, tokenAddress, payment);
  }

  // Override Crowdsale function
  function _updatePurchasingState(IERC20 tokenAddress, uint256 amount, address beneficiary) internal {
    _deposit(tokenAddress, amount, beneficiary);
    super._updatePurchasingState(tokenAddress, amount, beneficiary);
  }

}
