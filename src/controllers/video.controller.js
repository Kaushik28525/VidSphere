import mongoose, { isValidObjectId } from "mongoose";

import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";

import {
    uploadOnCloudinary,
    deleteFromCloudinary
} from "../utils/cloudinary.js";


const getAllVideos = asyncHandler(async (req, res) => {

    const {
        page = 1,
        limit = 10,
        query,
        sortBy,
        sortType,
        userId
    } = req.query;

    const pipeline = [];

    const matchStage = {};

    // Search by title or description
    if (query) {
        matchStage.$or = [
            {
                title: {
                    $regex: query,
                    $options: "i"
                }
            },
            {
                description: {
                    $regex: query,
                    $options: "i"
                }
            }
        ];
    }


    if (userId) {

        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid user ID");
        }

        matchStage.owner = new mongoose.Types.ObjectId(userId);
    }

    // Only published videos
    matchStage.isPublished = true;

    pipeline.push({
        $match: matchStage
    });

    if (sortBy) {

        const sort = {};

        sort[sortBy] = sortType === "asc" ? 1 : -1;

        pipeline.push({
            $sort: sort
        });

    } else {

        pipeline.push({
            $sort: {
                createdAt: -1
            }
        });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            fullname: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    );

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const result = await Video.aggregatePaginate(
        videoAggregate,
        options
    );

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                result,
                "Videos fetched successfully"
            )
        );
});


const publishAVideo = asyncHandler(async (req, res) => {

    const {
        title,
        description
    } = req.body;

    if (
        [title, description].some(
            field => !field || field.trim() === ""
        )
    ) {
        throw new ApiError(
            400,
            "All fields are required"
        );
    }

    const videoLocalPath =
        req.files?.videoFile?.[0]?.path;

    const thumbnailLocalPath =
        req.files?.thumbnail?.[0]?.path;

    if (!videoLocalPath) {
        throw new ApiError(
            400,
            "Video file is missing"
        );
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(
            400,
            "Thumbnail is missing"
        );
    }

    const [video, thumbnail] = await Promise.all([
        uploadOnCloudinary(videoLocalPath),
        uploadOnCloudinary(thumbnailLocalPath)
    ]);

    if (!video) {
        throw new ApiError(
            400,
            "Error while uploading video"
        );
    }

    if (!thumbnail) {
        throw new ApiError(
            400,
            "Error while uploading thumbnail"
        );
    }

    const owner = req.user._id;

    const vid = await Video.create({
        videoFile: video.url,
        thumbnail: thumbnail.url,
        title: title.trim(),
        description: description.trim(),
        duration: video.duration,
        owner
    });

    if (!vid) {
        throw new ApiError(
            500,
            "Something went wrong while creating video"
        );
    }

    return res
        .status(201)
        .json(
            new ApiResponce(
                201,
                vid,
                "Video uploaded successfully"
            )
        );
});

const getVideoById = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(
            400,
            "Invalid video ID"
        );
    }

    const video = await Video.findById(videoId)
        .populate(
            "owner",
            "username avatar fullname"
        );

    if (!video) {
        throw new ApiError(
            404,
            "Video not found"
        );
    }

    await Video.findByIdAndUpdate(
        videoId,
        {
            $inc: {
                views: 1
            }
        }
    );

    if (req.user?._id) {

        await User.findByIdAndUpdate(
            req.user._id,
            {
                $addToSet: {
                    watchHistory: videoId
                }
            }
        );
    }

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                video,
                "Video fetched successfully"
            )
        );
});

const updateVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    const {
        title,
        description
    } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(
            400,
            "Invalid video ID"
        );
    }

    if (!title && !description) {
        throw new ApiError(
            400,
            "Title or description is required"
        );
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(
            404,
            "Video not found"
        );
    }

    if (
        video.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "Unauthorized access"
        );
    }

    const updatedFields = {};

    if (title) {
        updatedFields.title = title.trim();
    }

    if (description) {
        updatedFields.description =
            description.trim();
    }

    const updatedVideo =
        await Video.findByIdAndUpdate(
            videoId,
            {
                $set: updatedFields
            },
            {
                new: true
            }
        );

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                updatedVideo,
                "Video updated successfully"
            )
        );
});

const deleteVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(
            400,
            "Invalid video ID"
        );
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(
            404,
            "Video not found"
        );
    }

    if (
        video.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(
            403,
            "Unauthorized access"
        );
    }

    await deleteFromCloudinary(
        video.videoFile,
        "video"
    );

    await deleteFromCloudinary(
        video.thumbnail
    );

    const deletedVideo =
        await Video.findByIdAndDelete(
            videoId
        );

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                deletedVideo,
                "Video deleted successfully"
            )
        );
});

const togglePublishStatus = asyncHandler(
    async (req, res) => {

        const { videoId } = req.params;

        if (!isValidObjectId(videoId)) {
            throw new ApiError(
                400,
                "Invalid video ID"
            );
        }

        const video = await Video.findById(
            videoId
        );

        if (!video) {
            throw new ApiError(
                404,
                "Video not found"
            );
        }
        if (
            video.owner.toString() !==
            req.user._id.toString()
        ) {
            throw new ApiError(
                403,
                "Unauthorized access"
            );
        }

        video.isPublished =
            !video.isPublished;

        await video.save();

        return res
            .status(200)
            .json(
                new ApiResponce(
                    200,
                    video,
                    `Video ${
                        video.isPublished
                            ? "published"
                            : "unpublished"
                    } successfully`
                )
            );
    }
);
export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};