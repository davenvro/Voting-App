var express = require("express");
var app = express();
var fs = require("fs");

app.use(express.static("public"));

app.get("/", function (request, response) {
    response.sendFile(__dirname + "/views/home.html");
});

app.get(/\/images\/.*$/, function (request, response) {
    imgFile = request.url.replace(/^.*\/images\//, "");
    response.sendFile(__dirname + "/views/images/" + imgFile);
});

app.get("/style.css", function (request, response) {
    response.sendFile(__dirname + "/views/style.css");
});

app.get("/header.html", function (request, response) {
    response.sendFile(__dirname + "/views/header.html");
});

app.get("/footer.html", function (request, response) {
    response.sendFile(__dirname + "/views/footer.html");
});

app.get("/homebody.html", function (request, response) {
    response.sendFile(__dirname + "/views/homebody.html");
});

app.get("/settings.html", function (request, response) {
    response.sendFile(__dirname + "/views/settings.html");
});

function readUserInfo(callback, response, data, userID) {
    var mongo = require("mongodb").MongoClient;
    var ObjectID = require("mongodb").ObjectID;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            response.end("Error loading database");
        } else {
            db.collection("myVotingPublic")
                .find({ "_id": ObjectID(userID) })
                .toArray(function (err, documents) {
                    if (err) {
                        response.end("Error reading collection");
                    } else {
                        if (documents.length == 0) {
                            response.redirect("/")
                        } else {
                            data = data.replace(/__username__/g, documents[0].fullname);
                            callback(response, data);
                        }
                    }
                });
            db.close();
        }
    });
};

function sendDataBack(response, data) {
    response.end(data);
}

app.get("/userhome", function (request, response) {
    fs.readFile(__dirname + "/views/userhome.html", "utf8", function (err, data) {
        if (err) {
            response.end("Error Loading Profile");
        } else {
            readUserInfo(sendDataBack, response, data, request.query.userID);
        }
    });
});

app.get("/logout", function (request, response) {
    response.sendFile(__dirname + "/views/home.html");
});

app.get(/\/votein=.*$/, function (request, response) {
    var pollID = request.url.replace(/^.*\/votein=/, "");
    var mongo = require("mongodb").MongoClient;
    var ObjectID = require("mongodb").ObjectID;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            response.end("Error loading database");
        } else {
            db.collection("myPolls")
                .find({ "_id": ObjectID(pollID) })
                .toArray(function (err, documents) {
                    if (err) {
                        response.end("Error reading polls");
                    } else {
                        if (documents.length == 0) {
                            response.end("Unable to find corresponding poll " + pollID);
                        } else {
                            fs.readFile(__dirname + "/views/votein.html", "utf8", function (err, data) {
                                if (err) {
                                    response.end("Error Loading Profile");
                                } else {
                                    data = data.replace(/__PollName__/g, documents[0].pollName);
                                    getPollItems(sendPollItems, response, data, pollID);
                                }
                            });
                        }
                    }
                });
            db.close();
        }
    });
});

app.get("/mypolls", function (request, response) {
    response.sendFile(__dirname + "/views/mypolls.html");
});

app.get("/personalpolls", function (request, response) {
    var mongo = require("mongodb").MongoClient;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            response.end("Error loading database");
        } else {
            db.collection("myPolls")
                .find({ "userID": request.query.userID })
                .sort({ "dateAdded": -1 })
                .toArray(function (err, documents) {
                    if (err) {
                        response.end("Error reading polls");
                    } else {
                        if (documents.length == 0) {
                            response.end("-- Empty polls --");
                        } else {
                            // var personalPolls = [];
                            var pollHTML = "";
                            for (var x = 0; x < documents.length && x < 15; x++) {
                                // personalPolls.push(documents[x].pollName);
                                pollHTML += "<li><a href='/pollInfo?pollID=" + documents[x]["_id"] + "'>" + documents[x].pollName + "</a></li>";
                            }
                            // response.end(JSON.stringify(personalPolls));
                            // console.log(pollHTML);
                            response.send(pollHTML);
                        }
                    }
                });
            db.close();
        }
    });
});

function getPollItems(callback, response, data, pollID) {
    var pollItems = "";
    var pollArray = [];
    var pollColor = [];
    var pollValue = [];
    var pollData = [];
    var counter = 0;
    var totalVotes = 0;
    var mongo = require("mongodb").MongoClient;
    var ObjectID = require("mongodb").ObjectID;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            console.log("Error loading database");
        } else {
            db.collection("myPollOptions")
                .find({ "pollID": ObjectID(pollID) })
                .sort({ "dateAdded": -1 })
                .toArray(function (err, documents) {
                    if (err) {
                        console.log("Error reading poll options");
                    } else {
                        if (documents.length == 0) {
                            console.log("Unable to find corresponding poll options for " + pollID);
                        } else {
                            for (var x = 0; x < documents.length; x++) {
                                var pollTmpColor = '#' + (function co(lor) {
                                    return (lor += [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f'][Math.floor(Math.random() * 16)]) && (lor.length == 6) ? lor : co(lor);
                                })('');
                                counter = documents[x].pollVotes;
                                totalVotes += counter;
                                pollArray.push("[" + counter + "] " + documents[x].pollItem);
                                pollColor.push(pollTmpColor);

                                pollData.push({
                                    label: "[" + counter + "] " + documents[x].pollItem,
                                    value: counter,
                                    color: pollTmpColor
                                });
                                pollItems += "<p><button id='" + documents[x]["_id"] + "'>Vote</button> " + documents[x].pollItem + "</p>";
                            }
                            data = data.replace(/__PollArray__/g, JSON.stringify(pollArray));
                            data = data.replace(/__PollColor__/g, JSON.stringify(pollColor));
                            data = data.replace(/__PollData__/g, JSON.stringify(pollData));
                            data = data.replace(/__PollItems__/g, pollItems);
                            if (totalVotes == 0) {
                                console.log("no data");
                                data = data.replace(/id="pieGraph">/g, 'id="noPieGraph"><h1>No votes yet.</h1>');
                            }
                            callback(response, data);
                        }
                    }
                });
            db.close();
        }
    });
};

function sendPollItems(response, data) {
    response.end(data);
};

app.get("/pollinfo", function (request, response) {
    var mongo = require("mongodb").MongoClient;
    var ObjectID = require("mongodb").ObjectID;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            response.end("Error loading database");
        } else {
            db.collection("myPolls")
                .find({ "_id": ObjectID(request.query.pollID) })
                .toArray(function (err, documents) {
                    if (err) {
                        response.end("Error reading polls");
                    } else {
                        if (documents.length == 0) {
                            response.end("Unable to find corresponding poll " + request.query.pollID);
                        } else {
                            fs.readFile(__dirname + "/views/pollinfo.html", "utf8", function (err, data) {
                                if (err) {
                                    response.end("Error Loading Profile");
                                } else {
                                    data = data.replace(/__PollName__/g, documents[0].pollName);
                                    data = data.replace(/__PollLink__/g, "http://192.168.15.8:8081/votein=" + request.query.pollID);
                                    getPollItems(sendPollItems, response, data, request.query.pollID);
                                }
                            });
                        }
                    }
                });
            db.close();
        }
    });
});

app.get("/popularpolls", function (request, response) {
    var mongo = require("mongodb").MongoClient;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            response.end("Error loading database");
        } else {
            db.collection("myPollInfo")
                .find()
                .sort()
                .toArray(function (err, documents) {
                    if (err) {
                        response.end("Error reading polls");
                    } else {
                        if (documents.length == 0) {
                            response.end("No popular polls");
                        } else {
                            response.end(documents);
                        }
                    }
                });
            db.close();
        }
    });
});

function saveUserProfile(callback, request, response) {
    var mongo = require("mongodb").MongoClient;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            return "Error loading database";
        } else {
            var record = {
                "fullname": request.query.fullname,
                "email": request.query.email,
                "password": request.query.password
            }
            console.log(record);
            db.collection("myVotingPublic")
                .insert(record, function (err, documents) {
                    if (err) {
                        console.log("Error adding user to the database.");
                    } else {
                        callback(response, "{ usedEmail: " + documents.insertedIds[0] + " }")
                    }
                });
            db.close();
        }
    });
};

function readUserData(response, data) {
    response.end(data);
};

app.post("/checkemail", function (request, response) {
    var mongo = require("mongodb").MongoClient;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            response.end("Error loading database");
        } else {
            db.collection("myVotingPublic")
                .find({ "email": request.query.email })
                .toArray(function (err, documents) {
                    if (err) {
                        response.end("Error reading collection");
                    } else {
                        if (documents.length == 0) {
                            saveUserProfile(readUserData, request, response);
                        } else if (documents[0].password == request.query.password) {
                            console.log(documents[0]);
                            readUserData(response, "{ usedEmail: " + documents[0]["_id"] + " }");
                        } else {
                            console.log(documents[0].password);
                            readUserData(response, "{ usedEmail: invalid password }");
                        }
                    }
                });
            db.close();
        }
    });
});

app.post("/checkoldpass", function (request, response) {
    var mongo = require("mongodb").MongoClient;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            console.log("Error loading database");
            response.end("Error loading database");
        } else {
            var recordDetail = {
                "email": request.query.email,
                "password": request.query.oldpass,
            };
            var recordUpdate = { $set: { "password": request.query.newpass } };
            db.collection("myVotingPublic")
                .update(recordDetail, recordUpdate, function (err, documents) {
                    if (err) {
                        console.log("invalidPass");
                        response.end("invalidPass");
                    } else {
                        if (documents.result.nModified > 0) {
                            console.log("validPass");
                            response.end("validPass");
                        } else {
                            console.log("invalidPass");
                            response.end("invalidPass");
                        }
                    }
                });
            db.close();
        }
    });
});

function SavePollOptions(pollID, pollOptions, response) {
    pollOptions = pollOptions.replace(/","/g, "\t");
    pollOptions = pollOptions.replace(/\["/, "");
    pollOptions = pollOptions.replace(/"\]/, "");
    var arrOptions = pollOptions.split("\t");
    var mongo = require("mongodb").MongoClient;
    var ObjectID = require("mongodb").ObjectID;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            console.log("Error loading database");
            response.end("Error loading database");
        } else {
            for (var x = 0; x < arrOptions.length; x++) {
                var recordDetail = {
                    "pollID": pollID,
                    "pollItem": arrOptions[x],
                    "pollVotes": 0,
                    "dateAdded": new Date().toISOString(),
                    "totalVotes": 0,
                    "dateUpdated": new Date().toISOString()
                };
                console.log(recordDetail);
                db.collection("myPollOptions")
                    .insert(recordDetail, function (err, documents) {
                        if (err) {
                            console.log("Error creating poll option: " + err);
                            response.end("Error creating poll option: " + err);
                            return;
                        }
                    });
            }
            response.end("success-->" + pollID);
        }
    });
}

app.post("/createPoll", function (request, response) {
    var mongo = require("mongodb").MongoClient;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            console.log("Error loading database");
            response.end("Error loading database");
        } else {
            var recordDetail = {
                "userID": request.query.userID,
                "pollName": request.query.pollName,
                "dateAdded": new Date().toISOString(),
                "totalVotes": 0,
                "dateUpdated": new Date().toISOString()
            };
            db.collection("myPolls")
                .insert(recordDetail, function (err, documents) {
                    if (err) {
                        console.log("Error creating poll.");
                        response.end("Error creating poll.");
                    } else {
                        SavePollOptions(documents.insertedIds[0], request.query.pollOptions, response);
                    }
                });
            db.close();
        }
    });
});

function UpdatePollVote(request, response) {
    var mongo = require("mongodb").MongoClient;
    var ObjectID = require("mongodb").ObjectID;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            console.log("Error loading database");
            response.end("Error loading database");
        } else {
            var recordDetail = {
                "_id": ObjectID(request.query.pollid)
            };
            var recordUpdate = { $inc: { "pollVotes": 1 } };
            db.collection("myPollOptions")
                .update(recordDetail, recordUpdate, function (err, documents) {
                    if (err) {
                        response.end("Unable to update poll count.");
                    } else {
                        if (documents.result.nModified > 0) {
                            response.end("Saved response to poll.");
                        } else {
                            response.end("Unable to update poll count.");
                        }
                    }
                });
            db.close();
        }
    });
}

function SaveUserPollVote(request, response) {
    var mongo = require("mongodb").MongoClient;
    var ObjectID = require("mongodb").ObjectID;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            console.log("Error loading database");
            response.end("Error loading database");
        } else {
            var record = {
                "pollID": request.query.pollid,
                "userIP": request.ip
            }
            db.collection("myPollVoters")
                .insert(record, function (err, documents) {
                    if (err) {
                        console.log("Error adding voter to the database.");
                    } else {
                        UpdatePollVote(request, response);
                    }
                });
            db.close();
        }
    });
}

app.post("/pollvote", function (request, response) {
    console.log(request.ip);
    var mongo = require("mongodb").MongoClient;
    var ObjectID = require("mongodb").ObjectID;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            console.log("Error loading database");
            response.end("Error loading database");
        } else {
            db.collection("myPollVoters")
                .find({ "pollID": request.query.pollid, "userIP": request.ip })
                .toArray(function (err, documents) {
                    if (err) {
                        response.end("Error reading collection");
                    } else {
                        if (documents.length == 0) {
                            SaveUserPollVote(request, response);
                        } else {
                            response.end("We do not allow multiple vote on the same item.");
                        }
                    }
                });
            db.close();
        }
    });
    // response.end("user voted for " + request.query.pollid + " " + request.ip);
});


app.post("/addpollitem", function (request, response) {
    var mongo = require("mongodb").MongoClient;
    var ObjectID = require("mongodb").ObjectID;
    mongo.connect("mongodb://127.0.0.1:27017", function (err, db) {
        if (err) {
            console.log("Error loading database");
            response.end("Error loading database");
        } else {
            var recordDetail = {
                "pollID": ObjectID(request.query.pollid),
                "pollItem": request.query.newpollitem,
                "pollVotes": 0,
                "dateAdded": new Date().toISOString(),
                "totalVotes": 0,
                "dateUpdated": new Date().toISOString()
            };
            console.log(recordDetail);
            db.collection("myPollOptions")
                .insert(recordDetail, function (err, documents) {
                    if (err) {
                        console.log("Error adding new poll option: " + err);
                        response.end("Error adding new poll option: " + err);
                    } else {
                        response.end("New poll item added.");
                    }
                });
            db.close();
        }
    });
});

// listen for requests :)
var listener = app.listen(8081, function () {
    console.log("Your app is listening on port " + listener.address().port);
});
