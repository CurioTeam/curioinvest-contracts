const { BN, ether, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');

const CurioFerrariCrowdsale = artifacts.require('CurioFerrariCrowdsale');
const CurioFerrariToken = artifacts.require('CurioFerrariToken');
const TestStableToken = artifacts.require('TestStableToken');

contract('_CurioFerrariRepurchaseCrowdsale', function (
  [_, owner, wallet, purchaser, investor, investor2, repurchaser, anyone]
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

    await this.crowdsale.addToWhitelist(repurchaser, { from: owner });

    await time.increaseTo(this.openingTime);
  });

  it('should init with false as repurchased state', async function () {
    (await this.crowdsale.tokensRepurchased()).should.be.equal(false);
  });

  context('without investors', function () {
    beforeEach(async function () {
      this.amount = TOKEN_FOR_SALE;
      this.value = this.amount.div(RATE);
    });

    it('should make repurchase', async function () {
      await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value);
      await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });

      (await this.token.balanceOf(repurchaser)).should.be.bignumber.equal(this.amount);
    });

    it('reverts on incorrect payment approved value (insufficient funds)', async function () {
      await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value.sub(new BN(1)));
      await shouldFail.reverting(this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser }));
    });

    it('should accept correct payment with approved excess funds', async function () {
      await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value.add(new BN(1)));
      await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });

      (await this.acceptedToken.balanceOf(purchaser)).should.be.bignumber.equal(new BN(1));
    });

    it('reverts on repurchase after buy', async function () {
      await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value);
      await this.crowdsale.buyToBeneficiary(this.amount, repurchaser, { from: purchaser });

      await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value);
      await shouldFail.reverting(this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser }));
    });

    it('should keep raised value (goal) on crowdsale contract', async function () {
      await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value);
      await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });

      (await this.acceptedToken.balanceOf(this.crowdsale.address)).should.be.bignumber.equal(GOAL);
    });
  });

  context('with first investor', function () {
    beforeEach(async function () {
      await this.crowdsale.addToWhitelist(investor, { from: owner });

      await transferAndApprove(this.acceptedToken, this.crowdsale.address, investor, investorValue);
      await this.crowdsale.buy(investorAmount, { from: investor });
    });

    it('reverts on incorrect payment approved value (insufficient funds)', async function () {
      await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, repurchaserValue.sub(new BN(1)));

      await shouldFail.reverting(this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser }));
    });

    it('should accept correct payment with approved excess funds', async function () {
      await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, repurchaserValue.add(new BN(1)));

      await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });

      (await this.acceptedToken.balanceOf(purchaser)).should.be.bignumber.equal(new BN(1));
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

      it('should set raised equal goal', async function () {
        await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });
        (await this.crowdsale.raised()).should.be.bignumber.equal(GOAL);
      });

      it('should transfer all tokens (equal goal value) to beneficiary', async function () {
        await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });
        (await this.token.balanceOf(repurchaser)).should.be.bignumber.equal(TOKEN_FOR_SALE);
      });

      it('should set to 0 repurchaser\'s deposit', async function () {
        await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });
        (await this.crowdsale.depositsOf(repurchaser)).should.be.bignumber.equal(new BN(0));
      });

      it('should set state as tokens repurchased', async function () {
        await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });
        (await this.crowdsale.tokensRepurchased()).should.be.equal(true);
      });

      it('should log repurchase', async function () {
        const { logs } = await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });
        expectEvent.inLogs(logs, 'TokensRepurchased', {
          beneficiary: repurchaser,
        });
      });
    });

    context('after repurchase', function () {
      beforeEach(async function () {
        await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, repurchaserValue);
        await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });
      });

      it('reverts on repurchase again', async function () {
        await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, repurchaserValue);
        await shouldFail.reverting(this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser }));
      });

      it('reverts on returning reward before finalization', async function () {
        await shouldFail.reverting(this.crowdsale.claimReward(investor, { from: anyone }));
      });

      context('after finalization', function () {
        beforeEach(async function () {
          this.investorClaimValue = investorValue.add(investorRewardValue);

          await this.crowdsale.finalize({ from: anyone });
        });

        it('should set state to Rewarding', async function () {
          /*
            From smart-contact:
            enum State { Active, Closed, Refunding, Rewarding }

            "Rewarding" index = 3
          */
          (await this.crowdsale.state()).should.be.bignumber.equal(new BN(3));
        });

        describe('claiming rewards', function () {
          it('should return reward', async function () {
            await this.crowdsale.claimReward(investor, { from: anyone });
          });

          it('reverts on second returning reward', async function () {
            await this.crowdsale.claimReward(investor, { from: anyone });
            await shouldFail.reverting(this.crowdsale.claimReward(investor, { from: anyone }));
          });

          it('reverts on non-investor returning reward', async function () {
            await shouldFail.reverting(this.crowdsale.claimReward(anyone, { from: anyone }));
          });

          it('reverts on repurchaser returning reward', async function () {
            await shouldFail.reverting(this.crowdsale.claimReward(repurchaser, { from: anyone }));
          });

          it('should transfer reward to beneficiary', async function () {
            await this.crowdsale.claimReward(investor, { from: anyone });
            (await this.acceptedToken.balanceOf(investor)).should.be.bignumber.equal(this.investorClaimValue);
          });

          it('should set to 0 beneficiary\'s deposit', async function () {
            (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(investorValue);
            await this.crowdsale.claimReward(investor, { from: anyone });
            (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(new BN(0));
          });

          it('should log returning reward', async function () {
            const { logs } = await this.crowdsale.claimReward(investor, { from: anyone });
            expectEvent.inLogs(logs, 'RewardWithdrawn', {
              rewardee: investor,
              amount: this.investorClaimValue,
            })
          });
        });

        context('after rewarding', function () {
          beforeEach(async function () {
            await this.crowdsale.claimReward(investor, { from: anyone });
          });

          it('should keep raised value (goal) on crowdsale contract', async function () {
            (await this.acceptedToken.balanceOf(this.crowdsale.address)).should.be.bignumber.equal(GOAL);
          });
        });
      });
    });

    context('with repurchaser as second investor', function () {
      beforeEach(async function () {
        this.investorAsRepurchaserAmount = ether('100000');
        this.investorAsRepurchaserValue = this.investorAsRepurchaserAmount.div(RATE);
        this.repurchaserValue = TOKEN_FOR_SALE.div(RATE)
          .sub(this.investorAsRepurchaserValue)
          .add(investorRewardValue);

        await transferAndApprove(this.acceptedToken, this.crowdsale.address, repurchaser, this.investorAsRepurchaserValue);
        await this.crowdsale.buy(this.investorAsRepurchaserAmount, { from: repurchaser });
      });

      it('should make repurchase', async function () {
        await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.repurchaserValue);

        await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });

        (await this.token.balanceOf(repurchaser)).should.be.bignumber.equal(TOKEN_FOR_SALE);
      });

      context('after repurchase and finalization', function () {
        beforeEach(async function () {
          await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.repurchaserValue);
          await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });

          this.investorClaimValue = investorValue.add(investorRewardValue);

          await this.crowdsale.finalize({ from: anyone });
        });

        it('reverts on repurchaser returning reward', async function () {
          await shouldFail.reverting(this.crowdsale.claimReward(repurchaser, { from: anyone }));
        });

        it('should return correct reward for first investor', async function () {
          (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(investorValue);
          await this.crowdsale.claimReward(investor, { from: anyone });
          (await this.acceptedToken.balanceOf(investor)).should.be.bignumber.equal(this.investorClaimValue);
          (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(new BN(0));
        });
      });
    });

    context('with 2 investors', function () {
      beforeEach(async function () {
        this.investor2Amount = ether('200000');
        this.investor2Value = this.investor2Amount.div(RATE);
        this.investor2RewardValue = this.investor2Value.mul(REWARDS_PERCENT).div(new BN(10000));
        this.repurchaserValue = TOKEN_FOR_SALE.div(RATE).add(investorRewardValue).add(this.investor2RewardValue);

        await this.crowdsale.addToWhitelist(investor2, { from: owner });

        await transferAndApprove(this.acceptedToken, this.crowdsale.address, investor2, this.investor2Value);
        await this.crowdsale.buy(this.investor2Amount, { from: investor2 });
      });

      it('should make repurchase', async function () {
        await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.repurchaserValue);

        await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });

        (await this.token.balanceOf(repurchaser)).should.be.bignumber.equal(TOKEN_FOR_SALE);
      });

      context('after repurchase and finalization', function () {
        beforeEach(async function () {
          await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.repurchaserValue);
          await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });

          this.investorClaimValue = investorValue.add(investorRewardValue);
          this.investor2ClaimValue = this.investor2Value.add(this.investor2RewardValue);

          await this.crowdsale.finalize({ from: anyone });
        });

        it('should return correct rewards values', async function () {
          (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(investorValue);
          await this.crowdsale.claimReward(investor, { from: anyone });
          (await this.acceptedToken.balanceOf(investor)).should.be.bignumber.equal(this.investorClaimValue);
          (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(new BN(0));

          (await this.crowdsale.depositsOf(investor2)).should.be.bignumber.equal(this.investor2Value);
          await this.crowdsale.claimReward(investor2, { from: anyone });
          (await this.acceptedToken.balanceOf(investor2)).should.be.bignumber.equal(this.investor2ClaimValue);
          (await this.crowdsale.depositsOf(investor2)).should.be.bignumber.equal(new BN(0));
        });
      });
    });
  });
});
