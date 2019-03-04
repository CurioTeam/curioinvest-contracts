const { BN, ether, expectEvent, shouldFail, time } = require('openzeppelin-test-helpers');

const CurioFerrariCrowdsale = artifacts.require('CurioFerrariCrowdsale');
const CurioFerrariToken = artifacts.require('CurioFerrariToken');
const TestStableToken = artifacts.require('TestStableToken');

contract('_CurioFerrariFinalizableCrowdsale', function (
  [_, owner, wallet, purchaser, investor, investor2, repurchaser, anyone]
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

  it('should init with false finalized state', async function () {
    (await this.crowdsale.finalized()).should.be.equal(false);
  });

  it('should set crowdsale state to Active', async function () {
    /*
      From smart-contact:
      enum State { Active, Closed, Refunding, Rewarding }

      "Active" index = 0
    */
    (await this.crowdsale.state()).should.be.bignumber.equal(new BN(0));
  });

  context('after opening time', function () {
    beforeEach(async function () {
      await time.increaseTo(this.openingTime);
    });

    it('cannot be finalized before ending or goal reached', async function () {
      await shouldFail.reverting(this.crowdsale.finalize({ from: anyone }));
    });

    context('with unreached goal', function () {
      beforeEach(async function () {
        this.amount = ether('100000');
        this.value = this.amount.div(RATE);

        await this.crowdsale.addToWhitelist(investor, { from: owner });

        await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value);
        await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });
      });


      it('cannot be finalized before ending', async function () {
        await shouldFail.reverting(this.crowdsale.finalize({ from: anyone }));
      });

      context('after closing time', function () {
        beforeEach(async function () {
          await time.increaseTo(this.afterClosingTime);
        });

        it('can be finalized', async function () {
          await this.crowdsale.finalize({ from: anyone });
        });

        it('cannot be finalized twice', async function () {
          await this.crowdsale.finalize({ from: anyone });
          await shouldFail.reverting(this.crowdsale.finalize({ from: anyone }));
        });

        it('should set finalized state to true', async function () {
          await this.crowdsale.finalize({ from: anyone });
          (await this.crowdsale.finalized()).should.be.equal(true);
        });

        it('should log finalized', async function () {
          const { logs } = await this.crowdsale.finalize({ from: anyone });
          expectEvent.inLogs(logs, 'CrowdsaleFinalized');
        });

        it('should set crowdsale state to Refunding', async function () {
          await this.crowdsale.finalize({ from: anyone });

          /*
            From smart-contact:
            enum State { Active, Closed, Refunding, Rewarding }

            "Refunding" index = 2
          */
          (await this.crowdsale.state()).should.be.bignumber.equal(new BN(2));
        });

        it('should log changing state to Refunding', async function () {
          const { logs } = await this.crowdsale.finalize({ from: anyone });
          expectEvent.inLogs(logs, 'RefundsEnabled');
        });
      })
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

      it('can be finalized', async function () {
        await this.crowdsale.finalize({ from: anyone });
      });

      it('should set crowdsale state to Closed', async function () {
        await this.crowdsale.finalize({ from: anyone });

        /*
          From smart-contact:
          enum State { Active, Closed, Refunding, Rewarding }

          "Closed" index = 1
        */
        (await this.crowdsale.state()).should.be.bignumber.equal(new BN(1));
      });

      it('should log changing state to Closed', async function () {
        const { logs } = await this.crowdsale.finalize({ from: anyone });
        expectEvent.inLogs(logs, 'CrowdsaleClosed');
      });

      context('after closing time', function () {
        beforeEach(async function () {
          await time.increaseTo(this.afterClosingTime);
        });

        it('should set crowdsale state to Closed', async function () {
          await this.crowdsale.finalize({ from: anyone });

          (await this.crowdsale.state()).should.be.bignumber.equal(new BN(1));
        });

        it('should log changing state to Closed', async function () {
          const { logs } = await this.crowdsale.finalize({ from: anyone });
          expectEvent.inLogs(logs, 'CrowdsaleClosed');
        });
      })
    });

    context('with reached goal via repurchase', function () {
      beforeEach(async function () {
        this.amount = ether('100000');
        this.value = this.amount.div(RATE);
        this.rewardValue = this.value.mul(REWARDS_PERCENT).div(new BN(10000));
        this.repurchaserValue = TOKEN_FOR_SALE.div(RATE).add(this.rewardValue);

        await this.crowdsale.addToWhitelist(investor, { from: owner });
        await this.crowdsale.addToWhitelist(repurchaser, { from: owner });

        await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.value);
        await this.crowdsale.buyToBeneficiary(this.amount, investor, { from: purchaser });

        await transferAndApprove(this.acceptedToken, this.crowdsale.address, purchaser, this.repurchaserValue);
        await this.crowdsale.repurchaseToBeneficiary(repurchaser, { from: purchaser });
      });

      it('can be finalized', async function () {
        await this.crowdsale.finalize({ from: anyone });
      });

      it('should set crowdsale state to Rewarding', async function () {
        await this.crowdsale.finalize({ from: anyone });

        /*
          From smart-contact:
          enum State { Active, Closed, Refunding, Rewarding }

          "Rewarding" index = 3
        */
        (await this.crowdsale.state()).should.be.bignumber.equal(new BN(3));
      });

      it('should log changing state to Rewarding', async function () {
        const { logs } = await this.crowdsale.finalize({ from: anyone });
        expectEvent.inLogs(logs, 'RewardsEnabled');
      });

      context('after closing time', function () {
        beforeEach(async function () {
          await time.increaseTo(this.afterClosingTime);
        });

        it('should set crowdsale state to Rewarding', async function () {
          await this.crowdsale.finalize({ from: anyone });

          (await this.crowdsale.state()).should.be.bignumber.equal(new BN(3));
        });

        it('should log changing state to Rewarding', async function () {
          const { logs } = await this.crowdsale.finalize({ from: anyone });
          expectEvent.inLogs(logs, 'RewardsEnabled');
        });
      });
    });
  });
});
