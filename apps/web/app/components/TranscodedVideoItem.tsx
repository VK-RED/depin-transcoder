import { Film } from "lucide-react";

interface TranscodedVideoItemProps {
    url: string,
    quality: "360p" | "480p",
    format? : "MP4"
}

export const TranscodedVideoItem = ({url, quality, format = "MP4"}: TranscodedVideoItemProps) => {

    return (
        <li 
            key={url}
            className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
            <Film className="h-5 w-5 text-indigo-500 mr-3" />
            <div className="flex-1">
            <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    {quality}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {format}
                </span>
            </div>
            <a
                href={url}
                className="text-indigo-600 hover:text-indigo-800 text-sm mt-1 block"
                target="_blank"
                rel="noopener noreferrer"
            >
                Download {quality} version
            </a>
            </div>
        </li>
    )
}