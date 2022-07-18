
import { expect } from "chai";
import hre, { ethers } from "hardhat";

type Factory = Awaited<ReturnType<typeof ethers.getContractFactory>>;
type Domain = Partial<{ name: string, version: string, chainId: number, verifyingContract: string }>;

const LIMIT_MESSAGES_FETCHABLE = 10;

describe("ChatRoom", function () {
  let contract: Awaited<ReturnType<Factory["deploy"]>>;
  let domain: Domain = { name: 'ChatBox', version: '1' };
  const types = {
    sendMessage: [
      { name: 'from', type: 'address' },
      { name: 'contents', type: 'string' }
    ]
  };

  before(() => {
    // set the corret chain id to the domain
    domain.chainId = hre.network.config.chainId;
  })

  beforeEach(async function () {
    // deploy the contract
    const Factory = await ethers.getContractFactory("ChatRoom");
    contract = await Factory.deploy();
    await contract.deployed()

    // set the contract address to the domain
    domain.verifyingContract = contract.address;
  });

  const expectCustomError = (error: Error, customError: string) => {
    const customRevertErrorMessage =
      "VM Exception while processing transaction: reverted with custom error";

    expect(error.message).to.eq(
      `${customRevertErrorMessage} '${customError}()'`
    )
  }

  it("send a message", async () => {
    const [[owner], currentId] = await Promise.all([ethers.getSigners(), contract.nextId()]);

    // create the required signature
    const value = { from: owner.address, contents: "hello world" };
    const signature = await owner._signTypedData(domain, types, value);

    // ensure we can post a message
    await expect(contract.sendMessage(value.contents, signature))
      .to.emit(contract, "MessageSent")
      .withArgs(currentId, owner.address);

    // ensure we cannot post an empty message
    try {
      await contract.sendMessage("", signature)
    } catch (error) {
      expectCustomError(error as Error, "EmptyMessage")
    }

    expect(await contract.nextId()).to.eq(currentId.add(1));
  });

  it(`fetch messages when there is more than ${LIMIT_MESSAGES_FETCHABLE} messages`, async () => {
    const [owner] = await ethers.getSigners();

    // create the required signature
    const value = { from: owner.address, contents: "hello world" };
    const signature = await owner._signTypedData(domain, types, value);

    // post fake messages 
    await Promise.all(new Array(LIMIT_MESSAGES_FETCHABLE + 3).fill(null)
      .map(() => contract.sendMessage(value.contents, signature))
    );

    // fetch all the messages and ensure only the latest were fetch
    const messages = await contract.getLast10Messages();
    expect(messages.length).to.eq(LIMIT_MESSAGES_FETCHABLE);
    const message = messages.find((message: { id: number }) => message.id === 3 || message.id === 2 || message.id === 1);
    expect(message).to.undefined;
  });

  it(`fetch messages when there is ${LIMIT_MESSAGES_FETCHABLE} messages`, async () => {
    const [owner] = await ethers.getSigners();

    // create the required signature
    const value = { from: owner.address, contents: "hello world" };
    const signature = await owner._signTypedData(domain, types, value);

    // post fake messages 
    await Promise.all(new Array(LIMIT_MESSAGES_FETCHABLE).fill(null)
      .map(() => contract.sendMessage(value.contents, signature))
    );

    // fetch all the messages and ensure only the latest were fetch
    const messages = await contract.getLast10Messages();
    expect(messages.length).to.eq(LIMIT_MESSAGES_FETCHABLE);
  });

  it(`fetch messages when there is less than ${LIMIT_MESSAGES_FETCHABLE} messages`, async () => {
    const [owner] = await ethers.getSigners();

    // create the required signature
    const value = { from: owner.address, contents: "hello world" };
    const signature = await owner._signTypedData(domain, types, value);

    // post fake messages 
    await Promise.all(new Array(LIMIT_MESSAGES_FETCHABLE / 2).fill(null)
      .map(() => contract.sendMessage(value.contents, signature))
    );

    // fetch all the messages and ensure we fetch all the messages in the contract
    const messages = await contract.getLast10Messages();
    const filteredMessages = messages.filter((message: { author: string }) => message.author !== ethers.constants.AddressZero).length
    expect(filteredMessages).to.eq(LIMIT_MESSAGES_FETCHABLE / 2);
  });

  it("like message", async () => {
    const [[owner, user], messageId] = await Promise.all([ethers.getSigners(), contract.nextId()]);

    // create the required signature
    const value = { from: owner.address, contents: "yo" };
    const signature = await owner._signTypedData(domain, types, value);

    // post a message
    await contract.sendMessage(value.contents, signature);

    // ensure we can like already posted message
    await expect(contract.connect(user).likeMessage(messageId))
      .to.emit(contract, "MessageLiked")
      .withArgs(messageId, user.address, owner.address);

    // ensure we can't like a non-posted message
    try {
      await contract.likeMessage(12);
    } catch (error) {
      expectCustomError(error as Error, "MessageDoesntExist")
    }
  });
});