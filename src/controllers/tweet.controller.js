import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createTweet = asyncHandler(async (req, res) => {

    const { content } = req.body;

    if (!content?.trim()) {
        throw new ApiError(400, "Tweet content not found");
    }

    const owner = req.user._id;

    const tweet = await Tweet.create({
        content: content.trim(),
        owner: owner
    });

    return res
        .status(201)
        .json(
            new ApiResponce(
                201,
                tweet,
                "Tweet created successfully!"
            )
        );
});


const getUserTweets = asyncHandler(async (req, res) => {

    const { userId } = req.params;

    if (!userId) {
        throw new ApiError(400, "User ID not found");
    }

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    const tweets = await Tweet.find({
        owner: userId
    }).sort({
        createdAt: -1
    });

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                tweets,
                "Tweets fetched successfully"
            )
        );
});


const updateTweet = asyncHandler(async (req, res) => {

    const { tweetId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    if (!content?.trim()) {
        throw new ApiError(400, "No content found for changes");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (
        tweet.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(403, "Unauthorized access");
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: content.trim()
            }
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
                updatedTweet,
                "Tweet updated successfully."
            )
        );
});


const deleteTweet = asyncHandler(async (req, res) => {

    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (
        tweet.owner.toString() !==
        req.user._id.toString()
    ) {
        throw new ApiError(403, "Unauthorized access");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                deletedTweet,
                "Tweet deleted successfully."
            )
        );
});


export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
};