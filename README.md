# OpenOracle Node Client

An OpenOracle Node client with automated bots for price reporting, settling, and dispute resolution.

## *Warning:* Alpha software! Test with small amounts only

## Features

- Swap Bot: Monitors and executes profitable token swaps
- Settlement Bot: Processes and settles pending reports
- Initial Report Bot: Submits price reports to the oracle
- Dispute Bot: Monitors and challenges incorrect price reports

## Setup

1. Clone the repository:

```bash
git clone https://github.com/uwupunks/openoracle.git
cd openoracle
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

- Copy `.env.example` to `.env`
- Fill in your configuration:
  - `VPS_PRIVATE_KEY`: Your private key
  - `ALCHEMY_API_KEY`: Your Alchemy API key
  - Other contract addresses are pre-configured for Arbitrum

## Running the Bots

Individual bot commands:

```bash
npm run swap     # Run swap bot
npm run settle   # Run settlement bot
npm run report   # Run initial report bot
npm run dispute  # Run dispute bot
```

Run all bots simultaneously:

```bash
npm run start:all
```

Stop all running bots:

```bash
npm run stop:all
```

## Dependencies

- ethers.js: ^6.15.0
- axios: ^1.10.0
- dotenv: ^17.2.0

## Contract Addresses (Arbitrum)

- WETH: `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1`
- USDC: `0xaf88d065e77c8cC2239327C5EDb3A432268e5831`
- Beacon: `0x8B504E2C93fd24cFE8BeD550992F9dd03ad6e59C`
- Oracle: `0x083bc19d1251ec66B8153ebD9F1C437727e5352E`
- Swap: `0xf2D9d22d2EaA282e8103b4Cd7344676ef04A9886`

## Run as Service

sudo cp scripts/open-oracle.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start open-oracle
sudo systemctl enable open-oracle


## Security

- Never commit your `.env` file
- Keep your private keys secure
- Monitor bot operations regularly
- Review transactions before confirmation

## License

GPL3
