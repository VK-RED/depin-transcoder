import { VideoItem } from "common/types"
import { Check, ChevronDown, ChevronUp, Clock, Video } from "lucide-react"
import { TranscodedVideoItem } from "./TranscodedVideoItem";

export interface VideoCardProps {
    video:VideoItem,
    setIsExpanded: React.Dispatch<React.SetStateAction<{
        [key: string]: boolean;
    }>>,
    isExpanded: {
        [key: string]: boolean;
    }
}

const getStatusIcon = (status: "PENDING" | "PROCESSING" | "PROCESSED") => {
    switch (status) {
    case 'PROCESSING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
    case 'PROCESSED':
        return <Check className="h-5 w-5 text-green-500" />;
    case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />;
    default:
        return null;
    }
};

export const VideoCard = ({video, setIsExpanded, isExpanded}:VideoCardProps) => {
    return (
        <div key={video.id} className="p-6">
            <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsExpanded(prev => ({
                    ...prev,
                    [video.id]: !prev[video.id]
                }))}
            >
                <div className="flex items-center">
                    <Video className="h-8 w-8 text-gray-400" />
                    <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">{video.title || "video.mp4"}</h3>
                        <p className="text-sm text-gray-500">Uploaded on {video.createdAt.toString().split("T")[0]}</p>
                    </div>
                </div>
                <div className="flex items-center">
                    {getStatusIcon(video.status)}
                    <span className="ml-2 text-sm capitalize text-gray-700">{video.status}</span>
                    {video.status === 'PROCESSED' && (video.mp4_360pLink || video.mp4_480pLink) && (
                        <div className="ml-4">
                            {isExpanded[video.id] ? 
                                <ChevronUp className="h-5 w-5 text-gray-500" /> : 
                                <ChevronDown className="h-5 w-5 text-gray-500" />
                            }
                        </div>
                    )}
                </div>
            </div>

            {video.status === 'PROCESSED' && (video.mp4_360pLink || video.mp4_480pLink) && isExpanded[video.id] && (
                <div className="mt-6 pl-12">
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Transcoded Versions</h4>
                    <ul className="space-y-3">
                        {video.mp4_360pLink && 
                            <TranscodedVideoItem
                                url={video.mp4_360pLink}
                                quality="360p"
                            />
                        }
                        {video.mp4_480pLink && 
                            <TranscodedVideoItem
                                url={video.mp4_480pLink}
                                quality="480p"
                            />
                        }
                    </ul>
                </div>
            )}
        </div>
    )
}