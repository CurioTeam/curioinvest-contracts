const { BN, ether, expectEvent, time } = require('openzeppelin-test-helpers');

const CurioFerrariCrowdsale = artifacts.require('CurioFerrariCrowdsale');
const CurioFerrariToken = artifacts.require('CurioFerrariToken');
const TestStableToken = artifacts.require('TestStableToken');

contract('_CurioFerrariRepurchaseCrowdsale', function (
  [_, owner, wallet, purchaser, investor, repurchaser]
) {
  const TOKEN_FOR_SALE = ether('300000');
  const RATE = new BN(1);
  const GOAL = TOKEN_FOR_SALE.div(RATE);
  const REWARDS_PERCENT = new BN(1000); // 10% reward

  const investorAmount = ether('100000');
  const investorValue = investorAmount.div(RATE);
  const investorRewardValue = investorValue.mul(REWARDS_PERCENT).div(new BN(10000));
  const repurchaserValue = TOKEN_FOR_SALE.div(RATE).add(investorRewardValue);

  const transferAndApprove = async (token, contract, beneficiary, value) => {
    await token.transfer(beneficiary, value, { from: owner });
    await token.approve(contract, value, { from: beneficiary });
  };

  before(async function () {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by ganache
    await time.advanceBlock();
  });

  beforeEach(async function () {
    this.openingTime = (await time.latest()).add(time.duration.weeks(1));
    this.closingTime = this.openingTime.add(time.duration.weeks(12));

    this.acceptedToken = await TestStableToken.new({ from: owner });
    this.token = await CurioFerrariToken.new({ from: owner });

    this.crowdsale = await CurioFerrariCrowdsale.new(
      this.openingTime, this.closingTime, wallet, this.token.address,
      this.acceptedToken.address, RATE, GOAL, REWARDS_PERCENT,
      { from: owner }
    );

    await this.token.transfer(
      this.crowdsale.address, TOKEN_FOR_SALE,
      { from: owner }
    );

    await this.crowdsale.addToWhitelist(investor, { from: owner });
    await this.crowdsale.addToWhitelist(repurchaser, { from: owner });

    await time.increaseTo(this.openingTime);

    await transferAndApprove(this.acceptedToken, this.crowdsale.address, investor, investorValue);
    await this.crowdsale.buy(investorAmount, { from: investor });
  });

  describe('high-level repurchase', function () {
    beforeEach(async function () {
      await transferAndApprove(this.acceptedToken, this.crowdsale.address, repurchaser, repurchaserValue);
    });

    it('should accept payment', async function () {
      await this.crowdsale.repurchase({ from: repurchaser });
    });
  });

  describe('low-level repurchase', function () {
    beforeEach(async function () {
      await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, repurchaserValue);
    });

    it('should accept payment', async function () {
      await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });
    });

    it('should log repurchase', async function () {
      const { logs } = await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });
      expectEvent.inLogs(logs, 'TokensRepurchased', {
        beneficiary: repurchaser,
      });
    });
  });

  // context('after repurchase', function () {

  // });
});
