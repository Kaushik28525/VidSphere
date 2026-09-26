import { isValidObjectId } from "mongoose";

import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const toggleSubscription = asyncHandler(async (req, res) => {

    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscriber = req.user._id;
    const channel = channelId;

    // Optional: prevent subscribing to yourself
    if (subscriber.toString() === channelId.toString()) {
        throw new ApiError(400, "You cannot subscribe to yourself");
    }

    // Check if channel exists
    const channelExists = await User.findById(channelId);

    if (!channelExists) {
        throw new ApiError(404, "Channel not found");
    }

    const subscribed = await Subscription.findOne({
        subscriber,
        channel
    });

    if (subscribed) {

        await Subscription.findOneAndDelete({
            subscriber,
            channel
        });

        return res
            .status(200)
            .json(
                new ApiResponce(
                    200,
                    {},
                    "Unsubscribed successfully"
                )
            );

    } else {

        const subscription = await Subscription.create({
            subscriber,
            channel
        });

        return res
            .status(201)
            .json(
                new ApiResponce(
                    201,
                    subscription,
                    "Subscribed successfully"
                )
            );
    }
});


// Get subscribers of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {

    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    const subscribers = await Subscription
        .find({ channel: channelId })
        .populate(
            "subscriber",
            "username fullname avatar"
        );

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                subscribers,
                "Channel subscribers fetched successfully"
            )
        );
});


// Get channels subscribed to by a user
const getSubscribedChannels = asyncHandler(async (req, res) => {

    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID");
    }

    const subscriptions = await Subscription
        .find({ subscriber: subscriberId })
        .populate(
            "channel",
            "username fullname avatar"
        );

    return res
        .status(200)
        .json(
            new ApiResponce(
                200,
                subscriptions,
                "Subscriptions fetched successfully"
            )
        );
});


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
};