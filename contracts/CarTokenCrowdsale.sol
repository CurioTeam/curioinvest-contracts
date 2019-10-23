pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/utils/ReentrancyGuard.sol";
import "./Pausable.sol";

/**
 * @title CarTokenCrowdsale
 * @dev CarTokenCrowdsale is a base contract for managing a token crowdsale,
 * allowing investors to purchase tokens with accepted token.
 */
contract CarTokenCrowdsale is Pausable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Crowdsale states:
    // Active - after init crowdsale and before finalization - crowdfunding state
    // Closed - when goal was reached and investors can withdraw purchased tokens
    // Refunding - when goal wasn't reached and investors can refunds
    // Rewarding - tokens were repurchased and investors can withdraw rewards
    enum State { Active, Closed, Refunding, Rewarding }

    // The token being sold
    IERC20 private _token;

    // Address of accepted token's contract
    IERC20 private _acceptedToken;

    // Address where funds are collected
    address private _wallet;

    // How many token units a buyer gets per unit of accepted token
    uint256 private _rate;

    // Amount of accepted tokens raised
    uint256 private _raised;

    // Raised funds withdrawn status
    bool private _raisedWithdrawn;

    // Amount of accepted tokens to be raised
    uint256 private _goal;

    // Percent of rewards after car purchase (1/100 of a percent; 0-10,000 map to 0%-100%)
    uint256 private _rewardsPercent;

    // Crowdsale opening time
    uint256 private _openingTime;

    // Crowdsale closing time
    uint256 private _closingTime;

    // Crowdsale states
    State private _state;

    // Finalization status
    bool private _finalized;

    // Tokens repurchase status
    bool private _tokensRepurchased;

    // Investors deposits storage
    mapping(address => uint256) private _deposits;

    // Investors verification statuses
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

    /**
     * Event for excess getting logging
     * @param beneficiary who got excess
     * @param value accepted tokens units as excess
     */
    event ExcessSent(address indexed beneficiary, uint256 value);

    /**
     * Event for token repurchase logging
     * @param beneficiary who made repurchase and got the tokens
     */
    event TokensRepurchased(address indexed beneficiary);

    /**
     * Event for finalization logging
     */
    event CrowdsaleFinalized();

    /**
     * Event for logging of crowdsale transition from state Active to state Closed
     */
    event CrowdsaleClosed();

    /**
     * Event for logging of crowdsale transition from state Active to state Refunding
     */
    event RefundsEnabled();

    /**
     * Event for logging of crowdsale transition from state Active to state Rewarding
     */
    event RewardsEnabled();

    /**
     * Event for logging of purchased tokens withdrawal
     * @param beneficiary who withdrawn tokens
     * @param amount amount of tokens withdrawn
     */
    event TokensClaimed(address indexed beneficiary, uint256 amount);

    /**
     * Event for refund withdrawal logging
     * @param refundee who got refund
     * @param amount amount of tokens withdrawn
     */
    event RefundWithdrawn(address indexed refundee, uint256 amount);

    /**
     * Event for reward withdrawal logging
     * @param rewardee who got reward
     * @param amount amount of tokens withdrawn
     */
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
        _raisedWithdrawn = false;
    }

    // -----------------------------------------
    // External interface
    // -----------------------------------------

    /**
     * @dev Fallback function. Reverts on sending ether.
     */
    function () external {
        revert();
    }

    /**
     * @return the token being sold.
     */
    function token() public view returns (IERC20) {
        return _token;
    }

    /**
     * @return accepted token's contract.
     */
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

    /**
     * @return raised funds withdrawn status.
     */
    function raisedWithdrawn() public view returns (bool) {
        return _raisedWithdrawn;
    }

    /**
     * @return the amount of accepted tokens to be raised.
     */
    function goal() public view returns (uint256) {
        return _goal;
    }

    /**
     * @return the percent of investor's reward.
     */
    function rewardsPercent() public view returns (uint256) {
        return _rewardsPercent;
    }

    /**
     * @return crowdsale status.
     */
    function state() public view returns (State) {
        return _state;
    }

    /**
     * @return true if the crowdsale is finalized, false otherwise.
     */
    function finalized() public view returns (bool) {
        return _finalized;
    }

    /**
     * @return tokens repurchase status.
     */
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

    /**
     * @return the deposit of an account in accepted token units.
     */
    function depositsOf(address payee) public view returns (uint256) {
        return _deposits[payee];
    }

    /**
     * @return the balance of an account.
     */
    function balanceOf(address account) public view returns (uint256) {
        return _toToken(_deposits[account]);
    }

    /**
     * @return is the investor in the white list.
     */
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
     * @dev Checks whether funding goal was reached.
     * @return Whether funding goal was reached
     */
    function goalReached() public view returns (bool) {
        return _raised >= _goal;
    }

    /**
     * @dev Changes crowdsale state.
     */
    function finalize() external {
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
     * @dev Buy tokens.
     * @param amount Amount of tokens will be buy
     */
    function buy(uint256 amount) external {
        buyToBeneficiary(amount, msg.sender);
    }

    /**
     * @dev Buy tokens for a given beneficiary.
     * @param amount Amount of tokens will be buy
     * @param beneficiary Recipient of the token purchase
     */
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

    /**
     * @dev Repurchase tokens.
     */
    function repurchase() external {
        repurchaseToBeneficiary(msg.sender);
    }

    /**
     * @dev Repurchase for a given beneficiary.
     * @param beneficiary Recipient of the token repurchase
     */
    function repurchaseToBeneficiary(address beneficiary) public nonReentrant {
        require(!_tokensRepurchased);
        _preValidatePurchase(_toToken(_goal), beneficiary);

        uint256 rewards = _calculateReward(_raised.sub(_deposits[beneficiary]));

        uint256 value = _goal.sub(_deposits[beneficiary]).add(rewards);
        require(value > 0);

        _acceptedToken.safeTransferFrom(msg.sender, address(this), value);

        // Update raised state
        _raised = _goal;

        // Transfer tokens directly to beneficiary
        _token.safeTransfer(beneficiary, _toToken(_goal));

        // Withdraw beneficiary deposit
        _deposits[beneficiary] = 0;

        _tokensRepurchased = true;
        emit TokensRepurchased(beneficiary);
    }

    /**
     * @dev Withdraw tokens only after crowdsale ends.
     * @param beneficiary Whose tokens will be withdrawn
     */
    function claimTokens(address beneficiary) external {
        require(finalized());
        require(_state == State.Closed);

        uint256 amount = _toToken(_deposits[beneficiary]);
        require(amount > 0);

        _deposits[beneficiary] = 0;

        _token.safeTransfer(beneficiary, amount);

        emit TokensClaimed(beneficiary, amount);
    }

    /**
     * @dev Investors can claim refunds here if crowdsale is unsuccessful.
     * @param refundee Whose refund will be claimed
     */
    function claimRefund(address refundee) external {
        require(finalized());
        require(_state == State.Refunding);

        uint256 amount = _deposits[refundee];
        require(amount > 0);

        _deposits[refundee] = 0;

        _acceptedToken.safeTransfer(refundee, amount);

        emit RefundWithdrawn(refundee, amount);
    }

    /**
     * @dev Investors can claim rewards here if anyone bought out tokens.
     * @param rewardee Whose reward will be claimed
     */
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
     * @dev Withdraws raised tokens from this contract to wallet.
     */
    function withdraw() onlyOwnerOrAdmin external {
        require(_state == State.Closed || _state == State.Rewarding);
        require(!_raisedWithdrawn);

        _acceptedToken.safeTransfer(_wallet, _raised);

        _raisedWithdrawn = true;
    }

    /**
     * @dev Withdraws unsold tokens from this contract to wallet.
     */
    function withdrawUnsoldTokens() onlyOwner external {
        require(_state == State.Refunding);

        uint256 amount = _token.balanceOf(address(this));
        _token.safeTransfer(_wallet, amount);
    }

    /**
     * @dev Withdraws any tokens from this contract to wallet.
     * @param tokenAddress The address of the foreign token
     */
    function withdrawForeignTokens(IERC20 tokenAddress) onlyOwner external {
        require(address(tokenAddress) != address(0));
        require(tokenAddress != _token);
        require(tokenAddress != _acceptedToken);

        uint256 amount = tokenAddress.balanceOf(address(this));
        tokenAddress.safeTransfer(_wallet, amount);
    }

    // -----------------------------------------
    // Internal interface
    // -----------------------------------------

    /**
     * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met.
     * @param amount Value in accepted token units involved in the purchase
     * @param beneficiary Token recipient address
     */
    function _preValidatePurchase(uint256 amount, address beneficiary) internal view whenNotPaused {
        require(isOpen());

        require(beneficiary != address(0));
        require(isWhitelisted(beneficiary));

        require(amount > 0);
    }

    /**
     * @dev Changes crowdsale state from Active to Closed.
     */
    function _close() internal {
        require(_state == State.Active);

        _state = State.Closed;

        emit CrowdsaleClosed();
    }

    /**
     * @dev Changes crowdsale state from Active to Refunding.
     */
    function _enableRefunds() internal {
        require(_state == State.Active);

        _state = State.Refunding;

        emit RefundsEnabled();
    }

    /**
     * @dev Changes crowdsale state from Active to Rewarding.
     */
    function _enableRewards() internal {
        require(_state == State.Active);

        _state = State.Rewarding;

        emit RewardsEnabled();
    }

    /**
     * @dev Converts accepted tokens to tokens for sale.
     * @param value Value of accepted tokens will be convert
     */
    function _toToken(uint256 value) internal view returns (uint256) {
        return _rate > 1 ? value.mul(_rate) : value;
    }

    /**
     * @dev Converts tokens for sale to accepted tokens.
     * @param amount Value of tokens for sale will be convert
     */
    function _fromToken(uint256 amount) internal view returns (uint256) {
        return _rate > 1 ? amount.div(_rate) : amount;
    }

    /**
     * @dev Calculates investor's reward.
     * @param amount Amount of investor's deposit
     */
    function _calculateReward(uint256 amount) internal view returns (uint256) {
        return amount.mul(_rewardsPercent).div(10000);
    }
}
