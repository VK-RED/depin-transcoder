import express from "express";
import cors from "cors";
import { authMiddleware } from "../middleware/auth";
import { dbClient } from "db/client";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUIDv7 } from "bun";
import type { VideoItem } from "common/types";
import { redis } from "cache/redis";
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

const port = process.env.PORT || 8080;

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;
const S3_BUCKET = process.env.S3_BUCKET!;
const S3_REGION = process.env.S3_REGION!;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

const s3 = new S3Client({
    region: S3_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,

    },
    apiVersion:"latest"
});

const clusterUrl = clusterApiUrl("devnet");
const connection = new Connection(clusterUrl);

const app = express();

app.use(express.json());
app.use(cors());
app.options("*", cors());

app.get("/", async (_req, res) => {
  res.send("Hello World");
});

app.post("/api/payout/:publicKey", async (req,res)=>{

  const publicKey = req.params.publicKey;

  if(!publicKey){
    const message = "Public key is required";
    res.json({message});
    return;
  }

  const validator = await dbClient.validator.findUnique({
    where:{
      publicKey
    }
  });

  console.log("Validator", validator);

  if(!validator){
    const message = "Validator not found, Please run as a Validator first to get payouts";
    res.json({message});
    return;
  }

  if(validator.pendingPayouts === 0){
    const message = "No Payouts to process, Run as a Validator to get payouts";
    res.json({message});
    return;
  }

  if(validator.payoutLocked){
    const message = "Payout is locked Please wait for the current payout to complete";
    res.json({message, payout:validator.pendingPayouts});
    return;
  }

  await redis.lpush("payouts", validator.id)
  res.json({message:`Payout ${validator.pendingPayouts / LAMPORTS_PER_SOL} SOL  queued for processing`, payout:validator.pendingPayouts});
  return;
})


// @ts-ignore
app.use(authMiddleware);

app.get("/api/preSignedUrl", async(req, res)=>{ 

  const uuid = randomUUIDv7();
  
  const fileName = req.query.fileName || "video.mp4";
  const key = uuid+"/"+fileName;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key:key,
    ContentType:"video/mp4",
  })

  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

  res.json({url, key});

})

app.post("/api/video", async(req, res)=>{

  type Body = {
    key: string;
    title?: string;
  }

  try {
    const userId = req.userId;
    const body = req.body as Body;

    const link = CLOUDFRONT_URL + "/" + body.key;

    await dbClient.video.create({
      data:{
        uploadedLink: link,
        title: body.title,
        userId,
      }
    });

    res.json({success:true, message:"Video Queued for Transcoding"});
  } catch (error) {
    console.log(error);
    res.status(400).send("Invalid request body");
    return;
  }
  
})

app.get("/api/videos", async(req, res)=>{
  
  const userId = req.userId;
  const videos: VideoItem[] = await dbClient.video.findMany({
    where:{
      userId
    },
    orderBy:{
      createdAt: "desc"
    }
  });

  res.json(videos);

})

app.get("/api/video/:id", async(req, res)=>{

  const videoId = req.params.id;

  if(!videoId){
    res.status(400).send("Video id is required");
    return;
  }

  let id:number;

  try {
    id = Number(videoId);
  } catch (error) {
    res.status(400).send("Invalid video id");
    return;
  }

  const userId = req.userId;
  const video = await dbClient.video.findUnique({
    where:{
      userId,
      id
    }
  });

  if(!video){
    res.status(404).send("Video not found");
    return;
  }

  if(video.userId !== userId){
    res.status(403).send("You are not authorized to access this video");
    return;
  }

  res.json(video);
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

const TIME_INTERVAL = 1000 * 5;

// Running on intervals to avoid rate limits
setInterval(async()=>{
  await processPayouts();
  await verifyTransactions();
}, TIME_INTERVAL)

async function processPayouts(){
  const validatorId = await redis.rpop("payouts");

  if(!validatorId){
    console.log(`No Validator ID found`);
    return;
  }

  const validator = await dbClient.validator.findUnique({
    where:{
      id: Number(validatorId)
    }
  });

  if(!validator){
    console.log(`Validator not found for the given ID ${validatorId}`);
    return;
  }

  if(validator.payoutLocked){
    console.log(`Payout is already locked for ${validator.id}`);
    return;
  }

  await dbClient.validator.update({
    where:{
      id: validator.id,
    },
    data:{
      payoutLocked: true,
    }
  })

  const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(PRIVATE_KEY)));

  const lamports = validator.pendingPayouts;

  const transferIx = SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: new PublicKey(validator.publicKey),
      lamports,
  });

  const {blockhash} = await connection.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
      payerKey:keypair.publicKey,
      recentBlockhash: blockhash,
      instructions : [transferIx],
  }).compileToV0Message();

  const versionedTx = new VersionedTransaction(messageV0);
  versionedTx.sign([keypair]);

  console.log(`Sending Payout to validator ${validator.publicKey} with ID ${validatorId} of Amount: ${validator.pendingPayouts}`);

  const tx = await connection.sendTransaction(versionedTx);

  console.log("Transaction signature: ", tx);

  const payout = await dbClient.payout.create({
    data:{
      amount: validator.pendingPayouts,
      validatorId: validator.id,
      txId: tx,
    }
  });

  console.log(`Payout created for validatorID ${validatorId}, payoutID ${payout.id}`);
}

async function verifyTransactions(){

  const payout = await dbClient.payout.findFirst({
    where:{
      verified: false,
    },
    orderBy:{
      createdAt: 'asc',
    }
  });

  if(!payout){
    console.log("No Payouts to verify");
    return;
  }

  const tx = payout.txId;
  const result = await connection.getParsedTransaction(tx, {maxSupportedTransactionVersion:0, commitment:"confirmed"});

  console.log("Transaction Result for ", tx);
  console.dir(result, {depth:null});

  // The tx may not be updated immmediately
  if(!result){
      console.log("Transaction not found, Retrying again");
      return;
  }

  const preBalances = result.meta?.preBalances;
  const postBalances = result.meta?.postBalances;

  // verify this based on the tx
  let isPaidSuccessfully = false;

  const fee = result.meta?.fee;

  if(preBalances && postBalances && fee && postBalances[1] - preBalances[1] === payout.amount && preBalances[0] - postBalances[0] === (fee + payout.amount)){
      isPaidSuccessfully = true;
      console.log("Transaction verified successfully for ", tx);
  }

  // this should not happen ideally
  if(!isPaidSuccessfully){
      return;
  }

  await dbClient.$transaction(async tx =>{

    const validator = await tx.validator.findUnique({
        where:{
            id:payout.validatorId,
        }
    });

    // This will not happen , just to satisfy TS
    if(!validator){
        console.log("Validator ID not found in DB", validator) 
        return;
    }

    // When We set to 0, The amount after locked will be lost, so to handle that
    const balanceToSet = validator.pendingPayouts - payout.amount ;

    await tx.validator.update({
        where: {
            id: payout.validatorId
        },
        data: {
            payoutLocked: false,
            pendingPayouts: balanceToSet,
        }
    });

    await tx.payout.update({
        where: {
            id: payout.id
        },
        data: {
            verified: true,
        }
    })
  })

}