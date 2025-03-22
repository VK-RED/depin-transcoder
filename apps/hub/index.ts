import { type ServerWebSocket } from "bun";
import type { HubPresignedUrlResponse, SignupRequest, SignUpResult, TranscodeRequest, TranscodeResult, ValidatorPresignedUrlRequest } from "common/types";
import { dbClient } from "db/client";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


let availableValidators : {id:number, ws:ServerWebSocket}[] = [];

const port = process.env.PORT || 8081;

// TODO: HANDLE THE AMOUNT BASED ON THE FILE SIZE
const AMOUNT_PER_TRANSCODE = 1000;

const CALLBACKS : {[key:number] :(data:TranscodeResult, ws: ServerWebSocket)=>void} = {};    

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

Bun.serve({
    port,
    fetch(req, server) {
      // upgrade the request to a WebSocket
      if (server.upgrade(req)) {
        return; // do not return a Response
      }
      return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
        async message(ws : ServerWebSocket, message: string) {

            const parsedMessage =  JSON.parse(message) as SignupRequest | TranscodeResult | ValidatorPresignedUrlRequest;

            if(parsedMessage.type === 'Signup'){
                const user = await signupHandler(parsedMessage.publicKey, ws);
                const signupResult: SignUpResult = {message: "Successfully Signed Up", validatorId: user.id, type:"Signup", callbackId:parsedMessage.callbackId} 
                ws.send(JSON.stringify(signupResult));
            }

            else if(parsedMessage.type === 'Transcode'){
                const key = parsedMessage.videoId;
                CALLBACKS[key](parsedMessage, ws);
                delete CALLBACKS[key];
            }

            else if(parsedMessage.type === 'PresignedUrl'){
                const result = await preSignedUrlHandler(parsedMessage.folderName);
                const data : HubPresignedUrlResponse = {
                    ...result,
                    callbackId: parsedMessage.callbackId,
                }

                console.log("Sending Presigned URLs", data);
                ws.send(JSON.stringify(data));
            }

            else{
                const result = {success:false, message:"Unknown Message Type"};
                ws.send(JSON.stringify(result));
            }
            
        },
        async close(ws: ServerWebSocket) {

            try {

                const validator = availableValidators.find(v => v.ws === ws);
                
                if(validator){
                    
                    const processingVideos = await dbClient.video.findMany({
                        where:{
                            validatorId: validator.id,
                        status:"PROCESSING", 
                        }
                    })
                    
    
                    console.log(`Processing Terminate Request for Validator ${validator.id}`);
                    // unassign it from current task if it goes down while processing a video
    
                    if(processingVideos.length){
    
                        const promises:any[] = [];
    
                        processingVideos.forEach(video => {
                            promises.push(dbClient.video.update({
                                where:{
                                    id: video.id,
                                },
                                data:{
                                    status: 'PENDING',
                                    validatorId:null,
                                    processingStartedAt:null,
                                }
                            }))
                        })
    
                        await Promise.all(promises);
                    }
    
                    const ind = availableValidators.findIndex(v => v.id === validator.id);
                    if(ind !== -1){
                        availableValidators.splice(ind, 1);
                    }
                }
                else{
                    console.log("Validator has left the room");
                    return;
                }

            
            } catch (error) {
                console.log("Error While Closing");
                console.log(error);
            }
        
        },

    }, // handlers

});

const TIME_INTERVAL = 1000 * 10;

setInterval(async()=>{

    // only pickup the videos that are not processed and not taken by any validator
    const videosToProcess = await dbClient.video.findMany({
        where:{
            status: 'PENDING',
            validatorId: null,
        },
        orderBy:{
            createdAt: 'asc',
        }
    });

    console.log(videosToProcess)

    const n = Math.min(videosToProcess.length, availableValidators.length);

    for(let i=0; i<n; i++){

        const video = videosToProcess[i];
        const validator = availableValidators[i];

        const startTime = new Date().toISOString();

        await dbClient.video.update({
            where:{
                id: video.id,
            },
            data:{
                status: 'PROCESSING',
                validatorId: validator.id,
                processingStartedAt: startTime,
            }
        }); 

        const payload : TranscodeRequest = {
            link: video.uploadedLink,
            videoId: video.id,
            type: 'Transcode',
        }

        const key = video.id;

        CALLBACKS[key] = handleTranscodeResult

        validator.ws.send(JSON.stringify(payload));
    }

    availableValidators = availableValidators.slice(n);

}, TIME_INTERVAL)


const signupHandler = async (publicKey:string, ws:ServerWebSocket) => {

    const validator = await dbClient.validator.upsert({
        where:{
            publicKey,
        },
        update:{},
        create:{
            publicKey,
        }
    });

    console.log("Validator Signed Up", validator);

    availableValidators.push({id:validator.id, ws});

    return validator;
}

const handleTranscodeResult = async (data:TranscodeResult, ws:ServerWebSocket) => {

    try {
        
        console.log(`Validator ${data.validatorId} has finished processing video ${data.videoId}`);

        const mp4_360p_link = CLOUDFRONT_URL + "/" + data.mp4_360pLink;
        const mp4_480p_link = CLOUDFRONT_URL + "/" + data.mp4_480pLink;

        console.log("360p link is ", mp4_360p_link);
        console.log("480p link is ", mp4_480p_link);

        await dbClient.$transaction(async (tx) => {

            await tx.video.update({
                where:{
                    id: data.videoId,
                },
                data:{
                    validatorId: data.validatorId,
                    processingEndedAt: data.processingEndAt,
                    mp4_360pLink: mp4_360p_link,
                    mp4_480pLink: mp4_480p_link,
                    status: "PROCESSED",
                }
            });

            await tx.validator.update({
                where:{
                    id: data.validatorId,
                },
                data:{
                    pendingPayouts:{
                        increment: AMOUNT_PER_TRANSCODE
                    }
                }
            })
        })

        console.log("Updated the Video status to PROCESSED and added the transcoded links to DB");

        availableValidators.push({id:data.validatorId, ws});

    } catch (error) {
        console.log("Error While Updating the Result");
    }

}

const preSignedUrlHandler = async(key:string) =>{

    const mp4_360p_key = key + "/" + "output_360p.mp4";
    const mp4_480p_key = key + "/" + "output_480p.mp4";

    console.log("Getting PreSigned URLs for", mp4_360p_key, mp4_480p_key);

    const command1 = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key:mp4_360p_key,
        ContentType:"video/mp4",
    });

    const command2 = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key:mp4_480p_key,
        ContentType:"video/mp4",
    });
    
    const [mp4_360p_uploadLink, mp4_480p_uploadLink] = await Promise.all([
        getSignedUrl(s3, command1, { expiresIn: 3600 }), 
        getSignedUrl(s3, command2, { expiresIn: 3600 })
    ]);

    const result : Omit<HubPresignedUrlResponse, "callbackId"> = {
        mp4_360p_uploadLink,
        mp4_480p_uploadLink,
        type: 'PresignedUrl',
    }

    return result;
}