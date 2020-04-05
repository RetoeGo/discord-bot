"use strict";

const got = require("got");
const uniqueRandomArray = require("unique-random-array");
const EventEmitter = require("eventemitter3");

function formatResult(getRandomImage) {
    const imageData = getRandomImage();
    if(!imageData) {
        return;
    }
    var obj = imageData;
    obj.url = `http://imgur.com/${imageData.hash}${imageData.ext.replace(/\?.*/, "")}`;
    return obj;
}

function storeResults(images, subreddit) {
    images.sort(function(a, b) { return a.score - b.score; });
    images = images.slice(0, 40);

    const getRandomImage = uniqueRandomArray(images);

    return getRandomImage;
}

function randomPuppy(subreddit) {
    subreddit = (typeof subreddit === "string" && subreddit.length !== 0) ? subreddit : "puppies";

    return got(`https://imgur.com/r/${subreddit}/hot.json`)
        .then(response => storeResults(JSON.parse(response.body).data, subreddit))
        .then(getRandomImage => formatResult(getRandomImage));
}

function all(subreddit) {
    const eventEmitter = new EventEmitter();

    function emitRandomImage(subreddit) {
        randomPuppy(subreddit).then(imageUrl => {
            eventEmitter.emit("data", imageUrl + "#" + subreddit);
            if(eventEmitter.listeners("data").length) {
                setTimeout(() => emitRandomImage(subreddit), 200);
            }
        });
    }

    emitRandomImage(subreddit);
    return eventEmitter;
}

function callback(subreddit, cb) {
    randomPuppy(subreddit)
        .then(url => cb(null, url))
        .catch(err => cb(err));
}

// subreddit is optional
// callback support is provided for a training exercise
module.exports = (subreddit, cb) => {
    if(typeof cb === "function") {
        callback(subreddit, cb);
    } else if(typeof subreddit === "function") {
        callback(null, subreddit);
    } else {
        return randomPuppy(subreddit);
    }
};

module.exports.all = all;
