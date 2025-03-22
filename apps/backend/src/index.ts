import express from "express";
import cors from "cors";
import { authMiddleware } from "../middleware/auth";
import { dbClient } from "db/client";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUIDv7 } from "bun";
import type { VideoItem } from "common/types";

const port = process.env.PORT || 8080;

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID!;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY!;
const S3_BUCKET = process.env.S3_BUCKET!;
const S3_REGION = process.env.S3_REGION!;
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL!;

const s3 = new S3Client({
    region: S3_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,

    },
    apiVersion:"latest"
});

const app = express();

app.use(express.json());
app.use(cors());
app.options("*", cors());

app.get("/", async (_req, res) => {
  res.send("Hello World");
});


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

// TODO: COMPLETE IT
app.post("/api/payout/:validatorId", async (req,res)=>{
  
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});