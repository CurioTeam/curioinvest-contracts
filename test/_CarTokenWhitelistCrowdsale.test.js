const { BN, ether, shouldFail, time } = require('openzeppelin-test-helpers');

const CarTokenCrowdsale = artifacts.require('CarTokenCrowdsale');
const CarToken = artifacts.require('CarToken');
const TestStableToken = artifacts.require('TestStableToken');

contract('_CurioFerrariWhitelistCrowdsale', function ([_, wallet, admin, investor, investor2, purchaser, anyone]) {
  const TOKEN_SUPPLY = ether('1100000');
  const RATE = new BN(1);
  const GOAL = TOKEN_SUPPLY.div(RATE);
  const REWARDS_PERCENT = new BN(1000);

  const amount = ether('42');
  const value = amount.div(RATE);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.openingTime = (await time.latest()).add(time.duration.weeks(1));
    this.closingTime = this.openingTime.add(time.duration.weeks(12));

    this.acceptedToken = await TestStableToken.new();
    this.token = await CarToken.new();

    this.crowdsale = await CarTokenCrowdsale.new(
      this.openingTime, this.closingTime, wallet, this.token.address,
      this.acceptedToken.address, RATE, GOAL, REWARDS_PERCENT
    );

    await this.token.transfer(
      this.crowdsale.address, TOKEN_SUPPLY
    );

    await this.crowdsale.changeAdmin(admin);

    await time.increaseTo(this.openingTime);
  });

  async function purchaseShouldSucceed (crowdsale, acceptedToken, beneficiary) {
    await acceptedToken.transfer(beneficiary, value);
    await acceptedToken.approve(crowdsale.address, value, { from: beneficiary });
    await crowdsale.buyToBeneficiary(amount, beneficiary, { from: beneficiary });

    await acceptedToken.transfer(beneficiary, value);
    await acceptedToken.approve(crowdsale.address, value, { from: beneficiary });
    await crowdsale.buy(amount, { from: beneficiary });
  }

  async function purchaseShouldFail (crowdsale, acceptedToken, beneficiary) {
    await acceptedToken.transfer(beneficiary, value);
    await acceptedToken.approve(crowdsale.address, value, { from: beneficiary });
    await shouldFail.reverting(crowdsale.buyToBeneficiary(amount, beneficiary, { from: beneficiary }));

    await acceptedToken.transfer(beneficiary, value);
    await acceptedToken.approve(crowdsale.address, value, { from: beneficiary });
    await shouldFail.reverting(crowdsale.buy(amount, { from: beneficiary}));
  }

  it('reverts if no admin add to whitelist', async function () {
    await shouldFail.reverting(this.crowdsale.addToWhitelist(investor, { from: anyone }));
  });

  context('with no whitelisted addresses', function () {
    it('rejects all purchases', async function () {
      await purchaseShouldFail(this.crowdsale, this.acceptedToken, anyone);
      await purchaseShouldFail(this.crowdsale, this.acceptedToken, investor);
    });
  });

  context('with whitelisted addresses', function () {
    beforeEach(async function () {
      await this.crowdsale.addToWhitelist(investor, { from: admin });
      await this.crowdsale.addToWhitelist(investor2, { from: admin });
    });


    it('accepts purchases with whitelisted beneficiaries', async function () {
      await purchaseShouldSucceed(this.crowdsale, this.acceptedToken, investor);
      await purchaseShouldSucceed(this.crowdsale, this.acceptedToken, investor2);
    });

    it('accepts purchases from non-whitelisted purchaser with whitelisted beneficiaries', async function () {
      await this.acceptedToken.transfer(purchaser, value);
      await this.acceptedToken.approve(this.crowdsale.address, value, { from: purchaser });
      await this.crowdsale.buyToBeneficiary(amount, investor, { from: purchaser });
    });

    it('rejects purchases from whitelisted addresses with non-whitelisted beneficiaries', async function () {
      await this.acceptedToken.transfer(investor, value);
      await this.acceptedToken.approve(this.crowdsale.address, value, { from: investor });
      await shouldFail(this.crowdsale.buyToBeneficiary(amount, anyone, { from: investor }));
    });

    it('rejects purchases with non-whitelisted beneficiaries', async function () {
      await purchaseShouldFail(this.crowdsale, this.acceptedToken, anyone);
    });
  });
});
