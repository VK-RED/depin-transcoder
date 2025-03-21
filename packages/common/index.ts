export type SignupRequest = {
    publicKey: string;
    type : 'Signup'
    callbackId: string;
}

export type SignUpResult = {
    validatorId: number;
    message:string;
    type: 'Signup'
    callbackId: string;
}

export type TranscodeResult = {
    videoId: number;
    type : 'Transcode';
    mp4_360pLink?: string;
    mp4_480pLink?: string;
    processingEndAt: string;
    validatorId: number;
}

export type TranscodeRequest = {
    videoId: number;
    link: string;
    type : 'Transcode';
}

export type TerminateRequest = {
    validatorId: number;
    type: 'Terminate'
}

export type ValidatorPresignedUrlRequest = {
    type : 'PresignedUrl';
    folderName: string;
    callbackId: string;
}

export type HubPresignedUrlResponse = {
    mp4_480p_uploadLink: string;
    mp4_360p_uploadLink: string;
    type: 'PresignedUrl';
    callbackId: string;
}