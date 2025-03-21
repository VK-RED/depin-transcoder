
/**
 * Create a WS client
 * Send a SIGNUP REQUEST
 *  STORE THE VALIDATOR ID
 * 
 * YOU LL RECEIVE THE TRANSCODE REQUEST
 *  PROCESS THE REQUEST
 *  SEND THE TRANSCODE RESULT
 */
import {type HubPresignedUrlResponse, type SignupRequest, type SignUpResult, type TranscodeRequest, type TranscodeResult, type ValidatorPresignedUrlRequest } from "common/types";
import { randomUUIDv7 } from "bun";
import axios, { AxiosError } from "axios";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

async function main(){

    const HUB_URL = process.env.HUB_URL!;
    const mp4_360p_video_name = "output_360p.mp4";
    const mp4_480p_video_name = "output_480p.mp4";

    let folderKey:string;
    let videoId:number;


    const ws = new WebSocket(HUB_URL);

    const CALLBACKS : {[key:string] : (data:SignUpResult | HubPresignedUrlResponse)=>void} = {};

    let validatorId : number|null = null;

    ws.onopen = () => {
        const uuid = randomUUIDv7();

        const payload : SignupRequest= {
            callbackId: uuid,
            publicKey: process.env.PUBLIC_KEY!,
            type: 'Signup'
        };

        
        CALLBACKS[uuid] = signupHandler;
        ws.send(JSON.stringify(payload));
    }

    ws.onmessage = async (event) => {
       
        const parsedMessage =  JSON.parse(event.data) as SignUpResult | TranscodeRequest | HubPresignedUrlResponse;

        if(parsedMessage.type === 'Signup'){
            CALLBACKS[parsedMessage.callbackId](parsedMessage);
            delete CALLBACKS[parsedMessage.callbackId];
        }

        if(parsedMessage.type === 'Transcode'){

            const {folderName, videoId:id} = await handleTranscode(parsedMessage);

            folderKey = folderName;
            videoId = id;

            const callbackId = randomUUIDv7()

            const data: ValidatorPresignedUrlRequest = {
                folderName,
                type: 'PresignedUrl',
                callbackId
            }

            CALLBACKS[callbackId]= uploadVideos;

            console.log("Sending Request for Presigned URLs");

            ws.send(JSON.stringify(data));
        }

        if(parsedMessage.type === 'PresignedUrl'){

            CALLBACKS[parsedMessage.callbackId](parsedMessage);
            delete CALLBACKS[parsedMessage.callbackId];

            const data: TranscodeResult = {
                videoId,
                type: 'Transcode',
                processingEndAt: new Date().toISOString(),
                validatorId: validatorId!,
                mp4_360pLink: folderKey+"/"+mp4_360p_video_name,
                mp4_480pLink: folderKey+"/"+mp4_480p_video_name,
            }   

            console.log("Sending Transcode Results");

            ws.send(JSON.stringify(data));

        }

    }

    const signupHandler = (data:SignUpResult|HubPresignedUrlResponse) => {

        if(data.type === "Signup"){
            validatorId = data.validatorId;
            console.log("Validator ID is ", validatorId);
        }
        
    }

    const handleTranscode = async (data:TranscodeRequest) => {
        console.log("Received Data for transcoding ", data);

        const link = data.link;

        const arr = link.split("/");
        const folderName = arr[arr.length-2];
        
        const response = await axios.get(link,{responseType:"stream"});
        response.data.pipe(fs.createWriteStream("video.mp4"));
        
        console.log("Downloaded the video");

        await new Promise((res, rej) => {
            ffmpeg("video.mp4")
            .videoCodec("libx264")
            .size("640x360")
            .audioCodec("aac")
            .outputOptions(["-movflags", "+faststart", "-crf", "18"])
            .on("error", (err) => {
                console.log("An error occurred: " + err.message);
                rej(err);
            })
            .on("end", () => {
                console.log("Finished processing the 360p video");
                res("Done");
            })
            .save(mp4_360p_video_name);
        })
        
        await new Promise((res, rej) => {
            ffmpeg("video.mp4")
            .videoCodec("libx264")
            .size("854x480")
            .audioCodec("aac")
            .outputOptions(["-movflags", "+faststart", "-crf", "18"])
            .on("error", (err) => {
                console.log("An error occurred: " + err.message);
                rej(err);
            })
            .on("end", () => {
                console.log("Finished processing 480p video");
                res("Done");
            })
            .save(mp4_480p_video_name);
        })
        
        return {folderName, videoId: data.videoId};

    }

    const uploadVideos = async (data:HubPresignedUrlResponse|SignUpResult) => {
        
        if(data.type === 'PresignedUrl'){

            console.log("Uploading Videos for");
            console.log(data);

            try {

                const mp4_360p_file = Bun.file(mp4_360p_video_name);
                const mp4_480p_file = Bun.file(mp4_480p_video_name);

                const mp4_360p_buffer = await mp4_360p_file.arrayBuffer();
                const mp4_480p_buffer = await mp4_480p_file.arrayBuffer();

                const res1 = axios.put(data.mp4_360p_uploadLink, mp4_360p_buffer, {
                    headers:{
                        "Content-Type": "video/mp4"
                    }
                });
        
                const res2 = axios.put(data.mp4_480p_uploadLink,mp4_480p_buffer, {
                    headers:{
                        "Content-Type": "video/mp4"
                    }
                });

                await Promise.all([res1, res2]);

                console.log("Cleanuping the Files");

                fs.unlinkSync("video.mp4");
                fs.unlinkSync(mp4_360p_video_name);
                fs.unlinkSync(mp4_480p_video_name);

                
            } catch (error) {
                console.log("Error While Uploading Videos");
                if(error instanceof AxiosError){
                    console.log(error.toJSON());
                }
                
            }

        }   

    }

}



main();