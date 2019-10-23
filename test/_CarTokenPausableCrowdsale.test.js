const { BN, ether, shouldFail, time } = require('openzeppelin-test-helpers');

const CarTokenCrowdsale = artifacts.require('CarTokenCrowdsale');
const CarToken = artifacts.require('CarToken');
const TestStableToken = artifacts.require('TestStableToken');

contract('_CurioFerrariPausableCrowdsale', function ([_, owner, wallet, purchaser, investor]) {
  const TOKEN_FOR_SALE = ether('300000');
  const RATE = new BN(1);
  const GOAL = TOKEN_FOR_SALE.div(RATE);
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

    this.acceptedToken = await TestStableToken.new({ from: owner });
    this.token = await CarToken.new({ from: owner });

    this.crowdsale = await CarTokenCrowdsale.new(
      this.openingTime, this.closingTime, wallet, this.token.address,
      this.acceptedToken.address, RATE, GOAL, REWARDS_PERCENT,
      { from: owner }
    );

    await this.token.transfer(
      this.crowdsale.address, TOKEN_FOR_SALE,
      { from: owner }
    );

    await this.crowdsale.addToWhitelist(investor, { from: owner });

    await this.acceptedToken.transfer(investor, value, { from: owner });
    await this.acceptedToken.approve(this.crowdsale.address, value, { from: investor });

    await this.acceptedToken.transfer(purchaser, value, { from: owner });
    await this.acceptedToken.approve(this.crowdsale.address, value, { from: purchaser });

    await time.increaseTo(this.openingTime);
  });

  it('purchases work', async function () {
    await this.crowdsale.buy(amount, { from: investor });
    await this.crowdsale.buyToBeneficiary(amount, investor, { from: purchaser });
  });

  context('after pause', function () {
    beforeEach(async function () {
      await this.crowdsale.pause({ from: owner });
    });

    it('purchases do not work', async function () {
      await shouldFail.reverting(this.crowdsale.buy(amount, { from: investor }));
      await shouldFail.reverting(this.crowdsale.buyToBeneficiary(amount, investor, { from: purchaser }));
    });

    context('after unpause', function () {
      beforeEach(async function () {
        await this.crowdsale.unpause({ from: owner });
      });

      it('purchases work', async function () {
        await this.crowdsale.buy(amount, { from: investor });
        await this.crowdsale.buyToBeneficiary(amount, investor, { from: purchaser });
      });
    });
  });
});
