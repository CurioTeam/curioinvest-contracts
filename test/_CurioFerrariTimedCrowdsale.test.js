const { BN, ether, shouldFail, should, time } = require('openzeppelin-test-helpers');

const CurioFerrariCrowdsale = artifacts.require('CurioFerrariCrowdsale');
const CurioFerrariToken = artifacts.require('CurioFerrariToken');
const TestStableToken = artifacts.require('TestStableToken');

contract('_CurioFerrariTimedCrowdsale', function ([_, wallet, purchaser, investor]) {
  const TOKEN_SUPPLY = ether('1100000');
  const RATE = new BN(1);
  const GOAL = TOKEN_SUPPLY;
  const REWARDS_PERCENT = new BN(1000);

  const amount = ether('42');
  const value = amount.div(RATE);

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.openingTime = (await time.latest()).add(time.duration.weeks(1));
    this.closingTime = this.openingTime.add(time.duration.weeks(1));
    this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));

    this.acceptedToken = await TestStableToken.new();
    this.token = await CurioFerrariToken.new();
  });

  it('reverts if the opening time is in the past', async function () {
    await shouldFail.reverting(CurioFerrariCrowdsale.new(
      (await time.latest()).sub(time.duration.days(1)), this.closingTime,
      wallet, this.token.address, this.acceptedToken.address, RATE, GOAL, REWARDS_PERCENT
    ));
  });

  it('reverts if the closing time is before the opening time', async function () {
    await shouldFail.reverting(CurioFerrariCrowdsale.new(
      this.openingTime, this.openingTime.sub(time.duration.seconds(1)),
      wallet, this.token.address, this.acceptedToken.address, RATE, GOAL, REWARDS_PERCENT
    ));
  });

  it('reverts if the closing time equals the opening time', async function () {
    await shouldFail.reverting(CurioFerrariCrowdsale.new(
      this.openingTime, this.openingTime,
      wallet, this.token.address, this.acceptedToken.address, RATE, GOAL, REWARDS_PERCENT
    ));
  });

  context('with crowdsale', function () {
    beforeEach(async function () {
      this.crowdsale = await CurioFerrariCrowdsale.new(
        this.openingTime, this.closingTime, wallet, this.token.address,
        this.acceptedToken.address, RATE, GOAL, REWARDS_PERCENT
      );

      await this.token.transfer(this.crowdsale.address, TOKEN_SUPPLY);
    });

    it('should be ended only after end', async function () {
      (await this.crowdsale.hasClosed()).should.equal(false);
      await time.increaseTo(this.afterClosingTime);
      (await this.crowdsale.isOpen()).should.equal(false);
      (await this.crowdsale.hasClosed()).should.equal(true);
    });

    describe('accepting payments', function () {
      before(async function () {
        await this.crowdsale.addToWhitelist(investor);
      });

      beforeEach(async function () {
        await this.crowdsale.addToWhitelist(investor);
        await this.acceptedToken.transfer(purchaser, value);
        await this.acceptedToken.approve(this.crowdsale.address, value, { from: purchaser });
        await this.acceptedToken.transfer(investor, value);
        await this.acceptedToken.approve(this.crowdsale.address, value, { from: investor });
      });

      it('should reject payments before start', async function () {
        (await this.crowdsale.isOpen()).should.equal(false);
        await shouldFail.reverting(this.crowdsale.buy(amount, { from: investor }));
        await shouldFail.reverting(this.crowdsale.buyToBeneficiary(amount, investor, { from: purchaser }));
      });

      it('should accept payments after start', async function () {
        await time.increaseTo(this.openingTime);
        (await this.crowdsale.isOpen()).should.equal(true);
        await this.crowdsale.buy(amount, { from: investor });
        await this.crowdsale.buyToBeneficiary(amount, investor, { from: purchaser });
      });

      it('should reject payments after end', async function () {
        await time.increaseTo(this.afterClosingTime);
        await shouldFail.reverting(this.crowdsale.buy(amount, { from: investor }));
        await shouldFail.reverting(this.crowdsale.buyToBeneficiary(amount, investor, { from: purchaser }));
      });
    });
  });
});
