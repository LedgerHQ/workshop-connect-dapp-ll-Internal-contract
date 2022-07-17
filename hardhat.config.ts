import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import 'dotenv/config';

const config: HardhatUserConfig = {
  solidity: "0.8.9",
  networks: {
    goerli: {
      url: process.env.ALCHEMY_ENDPOINT,
      accounts: [process.env.EOA_PRIVATE_KEY ?? ""]
    }
  },
  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_KEY ?? ""
    }
  },
};

export default config;
