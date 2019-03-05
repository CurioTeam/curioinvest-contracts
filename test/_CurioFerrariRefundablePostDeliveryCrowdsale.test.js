const { BN, ether, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');

const CurioFerrariCrowdsale = artifacts.require('CurioFerrariCrowdsale');
const CurioFerrariToken = artifacts.require('CurioFerrariToken');
const TestStableToken = artifacts.require('TestStableToken');

contract('_CurioFerrariRefundablePostDeliveryCrowdsale', function (
  [_, owner, admin, wallet, purchaser, investor, investor2, repurchaser, anyone]
) {
  const TOKEN_FOR_SALE = ether('300000');
  const RATE = new BN(1);
  const GOAL = TOKEN_FOR_SALE.div(RATE);
  const REWARDS_PERCENT = new BN(1000); // 10% reward

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
    this.afterClosingTime = this.closingTime.add(time.duration.seconds(1));

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
  });

  it('denies refunds before opening time', async function () {
    await shouldFail.reverting(this.crowdsale.claimRefund(investor));
  });

  context('after opening time', function () {
    beforeEach(async function () {
      await time.increaseTo(this.openingTime);
    });

    it('denies refunds', async function () {
      await shouldFail.reverting(this.crowdsale.claimRefund(investor));
    });

    context('with unreached goal', function () {
      beforeEach(async function () {
        this.amount = ether('100000');
        this.value = this.amount.div(RATE);

        await this.crowdsale.addToWhitelist(investor, {from: owner});

        await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value);
        await this.crowdsale.buyToBeneficiary(this.amount, investor, {from: purchaser});
      });

      it('does not immediately deliver tokens to beneficiaries', async function () {
        (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(this.value);
        (await this.crowdsale.balanceOf(investor)).should.be.bignumber.equal(this.amount);
        (await this.token.balanceOf(investor)).should.be.bignumber.equal('0');
      });

      it('does not allow beneficiaries to withdraw tokens before crowdsale ends', async function () {
        await shouldFail.reverting(this.crowdsale.claimTokens(investor));
      });

      it('denies refunds', async function () {
        await shouldFail.reverting(this.crowdsale.claimRefund(investor));
      });

      it('rejects reward withdrawals', async function () {
        await shouldFail.reverting(this.crowdsale.claimReward(investor));
      });

      it('rejects withdraw raised', async function () {
        await shouldFail.reverting(this.crowdsale.withdraw({ from: owner }));
      });

      context('after closing time and finalization', function () {
        beforeEach(async function () {
          await time.increaseTo(this.afterClosingTime);

          await this.crowdsale.finalize({ from: anyone });
        });

        it('rejects withdraw raised', async function () {
          await shouldFail.reverting(this.crowdsale.withdraw({ from: owner }));
        });

        it('rejects token withdrawals', async function () {
          await shouldFail.reverting(this.crowdsale.claimTokens(investor));
        });

        it('rejects reward withdrawals', async function () {
          await shouldFail.reverting(this.crowdsale.claimReward(investor));
        });

        describe('claim refunds', function () {
          it('should make refunds', async function () {
            await this.crowdsale.claimRefund(investor);
          });

          it('rejects multiple refunds', async function () {
            await this.crowdsale.claimRefund(investor);
            await shouldFail.reverting(this.crowdsale.claimRefund(investor));
          });

          it('should transfer refunded tokens to beneficiary', async function () {
            (await this.acceptedToken.balanceOf(investor)).should.be.bignumber.equal('0');
            await this.crowdsale.claimRefund(investor);
            (await this.acceptedToken.balanceOf(investor)).should.be.bignumber.equal(this.value);
          });

          it('should set to 0 beneficiaries deposit', async function () {
            (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(this.value);
            await this.crowdsale.claimRefund(investor);
            (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal('0');
          });

          it('should log refunds', async function () {
            const { logs } = await this.crowdsale.claimRefund(investor);
            expectEvent.inLogs(logs, 'RefundWithdrawn', {
              refundee: investor,
              amount: this.value,
            });
          });
        });
      });
    });

    context('with reached goal via purchase', function () {
      beforeEach(async function () {
        this.amount = ether('100000');
        this.value = this.amount.div(RATE);

        await this.crowdsale.addToWhitelist(investor, { from: owner });
        await this.crowdsale.addToWhitelist(investor2, { from: owner });

        await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value);
        await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });

        await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, GOAL.sub(this.value));
        await this.crowdsale.buyToBeneficiary(TOKEN_FOR_SALE.sub(this.amount), investor2, { from: purchaser });
      });

      it('does not immediately deliver tokens to beneficiaries', async function () {
        (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(this.value);
        (await this.crowdsale.balanceOf(investor)).should.be.bignumber.equal(this.amount);
        (await this.token.balanceOf(investor)).should.be.bignumber.equal('0');
      });

      it('does not allow beneficiaries to withdraw tokens before finalization', async function () {
        await shouldFail.reverting(this.crowdsale.claimTokens(investor));
      });

      it('denies refunds', async function () {
        await shouldFail.reverting(this.crowdsale.claimRefund(investor));
      });

      it('rejects reward withdrawals', async function () {
        await shouldFail.reverting(this.crowdsale.claimReward(investor));
      });

      it('rejects withdraw raised before finalization', async function () {
        await shouldFail.reverting(this.crowdsale.withdraw({ from: owner }));
      });

      context('after finalization', function () {
        beforeEach(async function () {
          await this.crowdsale.finalize({ from: anyone });
        });

        it('denies refunds', async function () {
          await shouldFail.reverting(this.crowdsale.claimRefund(investor));
        });

        it('rejects reward withdrawals', async function () {
          await shouldFail.reverting(this.crowdsale.claimReward(investor));
        });

        describe('claim tokens', function () {
          it('allows beneficiaries to withdraw tokens', async function () {
            await this.crowdsale.claimTokens(investor);
          });

          it('rejects multiple withdrawals', async function () {
            await this.crowdsale.claimTokens(investor);
            await shouldFail.reverting(this.crowdsale.claimTokens(investor));
          });

          it('should set to 0 beneficiaries deposit', async function () {
            (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(this.value);
            (await this.crowdsale.balanceOf(investor)).should.be.bignumber.equal(this.amount);
            await this.crowdsale.claimTokens(investor);
            (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal('0');
            (await this.crowdsale.balanceOf(investor)).should.be.bignumber.equal('0');
          });

          it('should transfer tokens to beneficiary', async function () {
            (await this.token.balanceOf(investor)).should.be.bignumber.equal('0');
            await this.crowdsale.claimTokens(investor);
            (await this.token.balanceOf(investor)).should.be.bignumber.equal(this.amount);
          });

          it('should log withdrawals', async function () {
            const { logs } = await this.crowdsale.claimTokens(investor);
            expectEvent.inLogs(logs, 'TokensClaimed', {
              beneficiary: investor,
              amount: this.amount,
            });
          });
        });

        describe('withdraw raised', function () {
          it('should withdraw raised by owner', async function () {
            await this.crowdsale.withdraw({ from: owner });
          });

          it('should withdraw raised by admin', async function () {
            await this.crowdsale.changeAdmin(admin, { from: owner });
            await this.crowdsale.withdraw({ from: admin });
          });

          it('reverts on withdraw raised by anyone', async function () {
            await shouldFail.reverting(this.crowdsale.withdraw({ from: anyone }));
          });

          it('should transfer raised to wallet', async function () {
            (await this.acceptedToken.balanceOf(wallet)).should.be.bignumber.equal('0');
            await this.crowdsale.withdraw({ from: owner });
            (await this.acceptedToken.balanceOf(wallet)).should.be.bignumber.equal(GOAL);
          });

          it('should set withdraw raised state to true', async function () {
            (await this.crowdsale.raisedWithdrawn()).should.be.equal(false);
            await this.crowdsale.withdraw({ from: owner });
            (await this.crowdsale.raisedWithdrawn()).should.be.equal(true);
          });

          it('reverts on withdraw raised twice', async function () {
            await this.crowdsale.withdraw({ from: owner });
            await shouldFail.reverting(this.crowdsale.withdraw({ from: owner }));
          });
        });
      });
    });

    context('with reached goal via repurchase', function () {
      beforeEach(async function () {
        this.amount = ether('100000');
        this.value = this.amount.div(RATE);
        this.rewardValue = this.value.mul(REWARDS_PERCENT).div(new BN(10000));
        this.investorClaimValue = this.value.add(this.rewardValue);
        this.repurchaserValue = TOKEN_FOR_SALE.div(RATE).add(this.rewardValue);

        await this.crowdsale.addToWhitelist(investor, { from: owner });
        await this.crowdsale.addToWhitelist(repurchaser, { from: owner });

        await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value);
        await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });

        await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.repurchaserValue);
        await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });
      });

      it('does not immediately deliver tokens to beneficiaries', async function () {
        (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(this.value);
        (await this.crowdsale.balanceOf(investor)).should.be.bignumber.equal(this.amount);
        (await this.token.balanceOf(investor)).should.be.bignumber.equal('0');
      });

      it('does not allow beneficiaries to withdraw tokens', async function () {
        await shouldFail.reverting(this.crowdsale.claimTokens(investor));
      });

      it('denies refunds', async function () {
        await shouldFail.reverting(this.crowdsale.claimRefund(investor));
      });

      it('rejects reward withdrawals before finalization', async function () {
        await shouldFail.reverting(this.crowdsale.claimReward(investor));
      });

      it('rejects withdraw raised', async function () {
        await shouldFail.reverting(this.crowdsale.withdraw({ from: owner }));
      });

      context('after finalization', function () {
        beforeEach(async function () {
          await this.crowdsale.finalize({ from: anyone });
        });

        it('does not allow beneficiaries to withdraw tokens', async function () {
          await shouldFail.reverting(this.crowdsale.claimTokens(investor));
        });

        it('should withdraw raised', async function () {
          await this.crowdsale.withdraw({ from: owner });
        });

        it('reverts on withdraw raised twice', async function () {
          await this.crowdsale.withdraw({ from: owner });
          await shouldFail.reverting(this.crowdsale.withdraw({ from: owner }));
        });

        it('denies refunds', async function () {
          await shouldFail.reverting(this.crowdsale.claimRefund(investor));
        });

        it('should return reward', async function () {
          (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal(this.value);
          await this.crowdsale.claimReward(investor);
          (await this.acceptedToken.balanceOf(investor)).should.be.bignumber.equal(this.investorClaimValue);
          (await this.crowdsale.depositsOf(investor)).should.be.bignumber.equal('0');
        });
      });
    });
  });
});
