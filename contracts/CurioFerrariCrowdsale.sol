pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "./Pausable.sol";

/**
* @title CurioFerrariCrowdsale
*/
contract CurioFerrariCrowdsale is Pausable, ReentrancyGuard {
  using SafeMath for uint256;
  using SafeERC20 for IERC20;

  enum State { Active, Closed, Refunding, Rewarding }

  // The token being sold
  IERC20 private _token;

  IERC20 private _acceptedToken;

  // Address where funds are collected
  address private _wallet;

  uint256 private _rate;

  uint256 private _raised;

  // Raise goal
  uint256 private _goal;

  // Percent of rewards after car purchase (1/100 of a percent; 0-10,000 map to 0%-100%)
  uint256 private _rewardsPercent;

  uint256 private _openingTime;

  uint256 private _closingTime;

  State private _state;

  bool private _finalized;

  bool private _tokensRepurchased;

  mapping(address => uint256) private _deposits;

  mapping (address => bool) private _whitelist;


  /**
   * Event for token purchase logging
   * @param purchaser who paid for the tokens
   * @param beneficiary who got the tokens
   * @param value accepted tokens units paid for purchase
   * @param amount amount of tokens purchased
   */
  event TokensPurchased(
    address indexed purchaser,
    address indexed beneficiary,
    uint256 value,
    uint256 amount
  );
  event ExcessSent(address indexed beneficiary, uint256 value);
  event TokensRepurchased(address indexed beneficiary);

  event CrowdsaleFinalized();
  event CrowdsaleClosed();
  event RefundsEnabled();
  event RewardsEnabled();

  event TokensClaimed(address indexed beneficiary, uint256 amount);
  event RefundWithdrawn(address indexed refundee, uint256 amount);
  event RewardWithdrawn(address indexed rewardee, uint256 amount);


  /**
   * @dev Constructor.
   * @param openingTime Crowdsale opening time
   * @param closingTime Crowdsale closing time
   * @param wallet Address where collected funds will be forwarded to
   * @param token Address of the token being sold
   * @param acceptedToken Address of the token being exchanged to token
   * @param rate Number of token units a buyer gets per accepted token's unit
   * @param goal Raise goal (soft and hard cap)
   * @param rewardsPercent Percent of investor's rewards after car purchased (0-10,000)
   */
  constructor (
    uint256 openingTime,
    uint256 closingTime,
    address wallet,
    IERC20 token,
    IERC20 acceptedToken,
    uint256 rate,
    uint256 goal,
    uint256 rewardsPercent
  )
    public
  {
    require(openingTime >= block.timestamp);
    require(closingTime > openingTime);
    require(wallet != address(0));
    require(address(token) != address(0));
    require(address(acceptedToken) != address(0));
    require(address(acceptedToken) != address(token));
    require(rate > 0);
    require(goal > 0);
    require(rewardsPercent > 0 && rewardsPercent <= 10000);

    _openingTime = openingTime;
    _closingTime = closingTime;
    _wallet = wallet;
    _token = token;
    _acceptedToken = acceptedToken;
    _rate = rate;
    _goal = goal;
    _rewardsPercent = rewardsPercent;
    _state = State.Active;

    _finalized = false;
    _tokensRepurchased = false;
  }


  // -----------------------------------------
  // External interface
  // -----------------------------------------
  function () external {
    revert();
  }

  /**
   * @return the token being sold.
   */
  function token() public view returns (IERC20) {
    return _token;
  }

  function acceptedToken() public view returns (IERC20) {
    return _acceptedToken;
  }

  /**
   * @return the address where funds are collected.
   */
  function wallet() public view returns (address) {
    return _wallet;
  }

  /**
   * @return the number of token units a buyer gets per accepted token's unit.
   */
  function rate() public view returns (uint256) {
    return _rate;
  }

  /**
   * @return the amount of tokens raised.
   */
  function raised() public view returns (uint256) {
    return _raised;
  }

  function goal() public view returns (uint256) {
    return _goal;
  }

  function rewardsPercent() public view returns (uint256) {
    return _rewardsPercent;
  }

  function state() public view returns (State) {
    return _state;
  }

  /**
   * @return true if the crowdsale is finalized, false otherwise.
   */
  function finalized() public view returns (bool) {
    return _finalized;
  }

  function tokensRepurchased() public view returns (bool) {
    return _tokensRepurchased;
  }

  /**
   * @return the crowdsale opening time.
   */
  function openingTime() public view returns (uint256) {
    return _openingTime;
  }

  /**
   * @return the crowdsale closing time.
   */
  function closingTime() public view returns (uint256) {
    return _closingTime;
  }

  /**
   * @return true if the crowdsale is open, false otherwise.
   */
  function isOpen() public view returns (bool) {
    return block.timestamp >= _openingTime && block.timestamp <= _closingTime;
  }

  /**
   * @dev Checks whether the period in which the crowdsale is open has already elapsed.
   * @return Whether crowdsale period has elapsed
   */
  function hasClosed() public view returns (bool) {
    return block.timestamp > _closingTime;
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
   * @dev Removes single address from whitelist.
   * @param account Address to be removed to the whitelist
   */
  function removeFromWhitelist(address account) external onlyAdmin {
    _whitelist[account] = false;
  }

  /**
   * @dev Must be called after crowdsale ends, to do some extra finalization
   * work. Calls the contract's finalization function.
   */
  function finalize() public {
    require(!_finalized);

    require(goalReached() || hasClosed());

    if (goalReached()) {
      if (tokensRepurchased()) {
        _enableRewards();
      } else {
        _close();
      }
    } else {
      _enableRefunds();
    }

    _finalized = true;
    emit CrowdsaleFinalized();
  }

  /**
   * @dev Set new wallet address.
   * @param newWallet New address where collected funds will be forwarded to
   */
  function setWallet(address newWallet) onlyOwner external {
    require(newWallet != address(0));
    _wallet = newWallet;
  }

  /**
   * @dev Buy tokens for accepted tokens.
   * @param amount Amount of tokens will be buy
   */
  function buy(uint256 amount) external {
    buyToBeneficiary(amount, msg.sender);
  }

  function buyToBeneficiary(uint256 amount, address beneficiary) public nonReentrant {
    _preValidatePurchase(amount, beneficiary);

    // How many tokens will be buy
    uint256 tokens = amount;

    // Calculate value of accepted tokens
    uint256 value = _fromToken(tokens);

    // Available tokens for purchase
    uint256 availableTokens = _toToken(_goal.sub(_raised));
    require(availableTokens > 0);

    _acceptedToken.safeTransferFrom(msg.sender, address(this), value);

    if (tokens > availableTokens) {
      tokens = availableTokens;

      // Value equivalent to purchased tokens
      value = _fromToken(tokens);

      uint256 excess = _fromToken(amount).sub(value);
      _acceptedToken.safeTransfer(beneficiary, excess);

      emit ExcessSent(beneficiary, excess);
    }

    // Update raised state
    _raised = _raised.add(value);

    // Save deposit
    _deposits[beneficiary] = _deposits[beneficiary].add(value);
    emit TokensPurchased(msg.sender, beneficiary, value, tokens);
  }

  function repurchase() external {
    repurchaseToBeneficiary(msg.sender);
  }

  function repurchaseToBeneficiary(address beneficiary) public nonReentrant {
    require(!_tokensRepurchased);
    require(!goalReached());
    _preValidatePurchase(_goal, beneficiary);

    uint256 rewards = _calculateReward(_raised.sub(_deposits[beneficiary]));

    uint256 value = _goal.sub(_deposits[beneficiary]).add(rewards);

    _acceptedToken.safeTransferFrom(msg.sender, address(this), value);

    // Update raised state
    _raised = _goal;

    // Transfer tokens directly to beneficiary
    _token.safeTransfer(beneficiary, _goal);

    // Withdraw beneficiary deposit
    _deposits[beneficiary] = 0;

    _tokensRepurchased = true;
    emit TokensRepurchased(beneficiary);
  }

  /**
   * @dev Withdraw tokens only after crowdsale ends.
   * @param beneficiary Whose tokens will be withdrawn.
   */
  function claimTokens(address beneficiary) public {
    require(finalized());
    require(_state == State.Closed);

    uint256 amount = _toToken(_deposits[beneficiary]);
    require(amount > 0);

    _deposits[beneficiary] = 0;

    _token.safeTransfer(beneficiary, amount);

    emit TokensClaimed(beneficiary, amount);
  }

  /**
   * @dev Investors can claim refunds here if crowdsale is unsuccessful
   * @param refundee Whose refund will be claimed.
   */
  function claimRefund(address refundee) external {
    require(finalized());
    require(_state == State.Refunding);

    uint256 amount = _deposits[refundee];

    _deposits[refundee] = 0;

    _acceptedToken.safeTransfer(refundee, amount);

    emit RefundWithdrawn(refundee, amount);
  }

  function claimReward(address rewardee) external {
    require(finalized());
    require(_state == State.Rewarding);

    require(_deposits[rewardee] > 0);

    uint256 amount = _deposits[rewardee];

    uint256 reward = _calculateReward(amount);

    amount = amount.add(reward);

    _deposits[rewardee] = 0;

    _acceptedToken.safeTransfer(rewardee, amount);

    emit RewardWithdrawn(rewardee, amount);
  }

  /**
   * @dev Checks whether funding goal was reached.
   * @return Whether funding goal was reached
   */
  function goalReached() public view returns (bool) {
    return _raised >= _goal;
  }

  /**
   * @dev Withdraws raised tokens from this contract to wallet.
   */
  function withdraw() onlyOwnerOrAdmin external {
    require(_state == State.Closed || _state == State.Rewarding);

    _acceptedToken.safeTransfer(_wallet, _raised);
  }

  /**
   * @dev Withdraws any tokens from this contract to wallet.
   * @param tokenAddress The address of the foreign token
   */
  function withdrawForeignTokens(IERC20 tokenAddress) onlyOwner external {
    require(address(tokenAddress) != address(0));

    // Withdraw any tokens when crowdsale closed or rewarding state
    // Else withdraw only not accepted tokens
    require(tokenAddress != _acceptedToken || _state == State.Closed || _state == State.Rewarding);

    uint256 amount = tokenAddress.balanceOf(address(this));
    tokenAddress.safeTransfer(_wallet, amount);
  }


  function depositsOf(address payee) public view returns (uint256) {
    return _deposits[payee];
  }

  /**
   * @return the balance of an account.
   */
  function balanceOf(address account) public view returns (uint256) {
    return _toToken(_deposits[account]);
  }

  // -----------------------------------------
  // Internal interface
  // -----------------------------------------

  function _preValidatePurchase(uint256 amount, address beneficiary) internal view whenNotPaused {
    require(isOpen());

    require(beneficiary != address(0));
    require(isWhitelisted(beneficiary));

    require(amount > 0);
  }

  /**
   * @dev Allows for the beneficiary to withdraw their funds, rejecting
   * further deposits.
   */
  function _close() internal {
    require(_state == State.Active);

    _state = State.Closed;

    emit CrowdsaleClosed();
  }

  /**
   * @dev Allows for refunds to take place, rejecting further deposits.
   */
  function _enableRefunds() internal {
    require(_state == State.Active);

    _state = State.Refunding;

    emit RefundsEnabled();
  }

  function _enableRewards() internal {
    require(_state == State.Active);

    _state = State.Rewarding;

    emit RewardsEnabled();
  }

  function _toToken(uint256 value) internal view returns (uint256) {
    return _rate > 1 ? value.mul(_rate) : value;
  }

  function _fromToken(uint256 amount) internal view returns (uint256) {
    return _rate > 1 ? amount.div(_rate) : amount;
  }

  function _calculateReward(uint256 amount) internal view returns (uint256) {
    return amount.mul(_rewardsPercent).div(10000);
  }
}
