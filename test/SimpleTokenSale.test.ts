const truffleAssert = require('truffle-assertions');
import { assert, web3, artifacts } from "hardhat";

const SimpleTokenSale = artifacts.require("SimpleTokenSale");
const SimpleToken = artifacts.require("SimpleToken");
const DaiMockToken = artifacts.require("DaiMockToken");

const bn1e18 = web3.utils.toBN(1e18);

const AGGREGATOR_ETH_USD_RINKEBY = "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e";
const AGGREGATOR_DAI_USD_RINKEBY = "0x2bA49Aaa16E6afD2a993473cfB70Fa8559B523cF";
const HOME_STUDENTS_RINKEBY = "0x0E822C71e628b20a35F8bCAbe8c11F274246e64D";

describe("SimpleTokenSale", () => {
  let accounts: string[];
  let owner: any;
  let payer: any;
  let simpleTokenInstance: any;
  let simpleTokenSaleInstance: any;
  let daiMockTokenInstance: any;

  const paymentAmount = bn1e18.muln(1);

  beforeEach(async function () {
    accounts = await web3.eth.getAccounts();
    owner = accounts[0];
    payer = accounts[1];
    simpleTokenInstance = await SimpleToken.new();
    daiMockTokenInstance = await DaiMockToken.new();
    simpleTokenSaleInstance = await SimpleTokenSale.new(simpleTokenInstance.address, daiMockTokenInstance.address, HOME_STUDENTS_RINKEBY, AGGREGATOR_ETH_USD_RINKEBY, AGGREGATOR_DAI_USD_RINKEBY);
    await simpleTokenInstance.transfer(simpleTokenSaleInstance.address, web3.utils.toBN(500).mul(bn1e18));
  });

  describe("buyTokens", function () {
    it("Should buyTokens successfully", async () => {
      const tokenBalanceBefore = await simpleTokenInstance.balanceOf(payer);
      const simpleTokenSaleBalenceBefore = await simpleTokenInstance.balanceOf(simpleTokenSaleInstance.address);
      const result = await simpleTokenSaleInstance.buyTokens({ from: payer, value: paymentAmount });

      truffleAssert.eventEmitted(result, 'Bought', (event: any) => {
        return event._buyer.toLowerCase() === payer.toLowerCase() && event._amount.eq(web3.utils.toBN("1000000000000000000"))
      })

      const simpleTokenSaleBalenceBeforeAfter = await simpleTokenInstance.balanceOf(simpleTokenSaleInstance.address);
      const tokenBalanceAfter = await simpleTokenInstance.balanceOf(payer);

      assert.notEqual(web3.utils.toBN(0), simpleTokenSaleBalenceBefore.sub(simpleTokenSaleBalenceBeforeAfter));
      assert.equal(true, tokenBalanceBefore.eq(tokenBalanceAfter.sub(simpleTokenSaleBalenceBefore.sub(simpleTokenSaleBalenceBeforeAfter))));
    });

    it("Should get back ether for too much bought amount", async () => {
      const ethBalanceBefore = await web3.eth.getBalance(payer);

      const result = await simpleTokenSaleInstance.buyTokens({ from: payer, value: paymentAmount.mul(web3.utils.toBN(20)) });

      const ethBalanceAfter = await web3.eth.getBalance(payer);

      const transaction = await web3.eth.getTransaction(result.tx);

      assert.equal(true, web3.utils.toBN(result.receipt.gasUsed).mul(web3.utils.toBN(transaction.gasPrice)).eq(web3.utils.toBN(ethBalanceBefore).sub(web3.utils.toBN(ethBalanceAfter))));
    });

    it("Should not be able to buy tokens due to 0 eth sent", async () => {
      const payerTokenBalanceBefore = await simpleTokenInstance.balanceOf(payer);
      const contractTokenBalanceBefore = await simpleTokenInstance.balanceOf(simpleTokenSaleInstance.address);

      await truffleAssert.reverts(
        simpleTokenSaleInstance.buyTokens({ from: payer, value: 0 }),
        "Amount of tokens can't be 0"
      );

      const payerTokenBalanceAfter = await simpleTokenInstance.balanceOf(payer);
      const contractTokenBalanceAfter = await simpleTokenInstance.balanceOf(simpleTokenSaleInstance.address);

      assert.equal(true, payerTokenBalanceBefore.eq(payerTokenBalanceAfter));
      assert.equal(true, contractTokenBalanceBefore.eq(contractTokenBalanceAfter));
    });

    it("Should buyTokensForDai successfully", async () => {
      await daiMockTokenInstance.approve(simpleTokenSaleInstance.address, web3.utils.toBN(1000).mul(bn1e18));
      const tokenBalanceBefore = await simpleTokenInstance.balanceOf(owner);
      const simpleTokenSaleBalenceBefore = await simpleTokenInstance.balanceOf(simpleTokenSaleInstance.address);
      const result = await simpleTokenSaleInstance.buyTokensForDai(paymentAmount);

      truffleAssert.eventEmitted(result, 'Bought', (event: any) => {
        return event._buyer.toLowerCase() === owner.toLowerCase()
      })

      const simpleTokenSaleBalenceAfter = await simpleTokenInstance.balanceOf(simpleTokenSaleInstance.address);
      const tokenBalanceAfter = await simpleTokenInstance.balanceOf(owner);

      assert.notEqual(web3.utils.toBN(0), simpleTokenSaleBalenceBefore.sub(simpleTokenSaleBalenceAfter));
      assert.equal(true, tokenBalanceBefore.eq(tokenBalanceAfter.sub(simpleTokenSaleBalenceBefore.sub(simpleTokenSaleBalenceAfter))));

      const tokenBalanceBeforeSold = await simpleTokenInstance.balanceOf(owner);
      const simpleTokenSaleBalenceBeforeSold = await simpleTokenInstance.balanceOf(simpleTokenSaleInstance.address);

      truffleAssert.eventEmitted(result, 'Sold', (event: any) => {
        return event._seller.toLowerCase() === owner.toLowerCase() && event._amount.eq(web3.utils.toBN("1000000000000000000"))
      })

      const simpleTokenSaleBalenceAfterSold = await simpleTokenInstance.balanceOf(simpleTokenSaleInstance.address);
      const tokenBalanceAfterSold = await simpleTokenInstance.balanceOf(owner);

      assert.notEqual(web3.utils.toBN(0), simpleTokenSaleBalenceBeforeSold.sub(simpleTokenSaleBalenceAfterSold));
      assert.equal(true, tokenBalanceBeforeSold.eq(tokenBalanceAfterSold.sub(simpleTokenSaleBalenceBefore.sub(simpleTokenSaleBalenceAfterSold))));
    });

    it("Should not be able to buy tokens due to not approved", async () => {
      await truffleAssert.reverts(
        simpleTokenSaleInstance.buyTokensForDai(paymentAmount),
        "Spending tokens are not allowed"
      );
    });
  });

});



