# Depin Video Transcoder

This Project uses bun as the package manager and uses Docker for running Redis. Solana for sending transactions.

### Preview
https://github.com/user-attachments/assets/d928b667-8bf9-4602-93b7-d5ad31337af6

### Steps to Setup the Project
- Clone the Project

#### DATABASE
- Go to packages/db folder and run  `cp .env.example .env` in the terminal, replace existing DATABASE_URL in .env file (or) leave it as such if you're running it via Docker.
- Run `bunx prisma migrate dev` in the terminal, you are good to go !!

#### BACKEND
- Go to apps/backend folder and run `cp .env.example .env`
- Replace the actual values in the .env file.
- Start Redis locally or run `docker run -p 3000:3000 redis` in the terminal to start running the Redis.
- Finally run `bun start` in the terminal to start the backend services. You can see the backend running at http://localhost:8080

#### WEB
- Go to apps/web folder 
- Run cp .env.example .env in the terminal
-    Replace the actual values in the .env file.
- Finally run `bun run dev` in terminal, you can visit the app running at http://localhost:3000

#### HUB
- Hub is the central manager to  manage the validators.
- Go to apps/hub folder.
- Run `cp .env.example .env` and replace the actual values in the .env file.
- Run `bun start` in the terminal, you can see the WebSocket Server running at ws://localhost:8081

#### VALIDATOR

##### CONFIGURATIONS
- **NOTE**: To run a Validator your system needs to have ***ffmpeg*** installed to transcode the videos
- Linux : run `sudo apt update  && sudo apt install ffmpeg` in the terminal.
- macOS: run `brew install ffmpeg`
- Windows: go here https://ffmpeg.org/download.html
  
##### SETUP
- Go to apps/validator folder.
- Run `cp .env.example .env`
- Replace the PUBLIC_KEY with your Solana Address in the .env file.
- Replace `HUB_URL="ws://localhost:8081"` incase you're running the hub locally.
- Run `bun start` in the terminal

### CONTRIBUTIONS
If you feel an issue or something needs to be fixed , please raise an Issue or a PR. Your contributions are welcomed most !! :pray: