import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {

    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized access");
    }

    const totalSubscribers = await Subscription.countDocuments({
        channel: userId
    });

    const videoStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" },
                totalLikes: { $sum: { $size: "$likes" } }
            }
        }
    ]);

    const stats = videoStats[0] || {
        totalVideos: 0,
        totalViews: 0,
        totalLikes: 0
    };

    const channelStats = {
        totalSubscribers,
        totalVideos: stats.totalVideos,
        totalViews: stats.totalViews,
        totalLikes: stats.totalLikes
    };

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                channelStats,
                "Generated channel stats"
            )
        );
});


const getChannelVideos = asyncHandler(async (req, res) => {

    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized access");
    }

    const videos = await Video.find({
        owner: userId
    }).sort({
        createdAt: -1
    });

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                videos,
                "Fetched videos of channel"
            )
        );
});


export {
    getChannelStats,
    getChannelVideos
};