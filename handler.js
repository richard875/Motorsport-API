"use strict";
const AWS = require("aws-sdk");
const db = new AWS.DynamoDB.DocumentClient({ apiVersion: "2012-08-10" });
const uuid = require("uuid/v4");

let id = 1;
const postsTable = process.env.POSTS_TABLE;
// Create a response
function response(statusCode, message) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(message),
  };
}
function sortByDate(a, b) {
  if (a.createdAt > b.createdAt) {
    return -1;
  } else return 1;
}
// Create a post
module.exports.createPost = (event, context, callback) => {
  const reqBody = JSON.parse(event.body);

  if (!(reqBody.appCategory === 1) && !(reqBody.appCategory === 2)) {
    return callback(
      null,
      response(400, {
        error: "appCategory must be either 1 or 2, 1 for news and 2 for events",
      })
    );
  }

  if (reqBody.newsCategory < 1 || reqBody.newsCategory > 17) {
    return callback(
      null,
      response(400, {
        error:
          "newsCategory must be between 1 and 17, 1 for Formula 1, 2 for Formula E, 3 for Supercars, 4 for WEC, 5 for NASCAR, 6 for Indycar, 7 for Esports, 8 for Open wheel, 9 for Enduro, 10 for Stock, 11 for Drag, 12 for Rally, 13 for Off-road, 14 for Touring, 15 for Moto GP, 16 for Motocross, 17 for Other",
      })
    );
  }

  if (!(reqBody.region === 1) && !(reqBody.region === 2)) {
    return callback(
      null,
      response(400, {
        error: "region must be either 1 or 2, 1 for world and 2 for nz",
      })
    );
  }

  // appCategory: 1 for news and 2 for events

  // newsCategory: 1 for Formula 1, 2 for Formula E, 3 for Supercars, 4 for WEC, 5 for NASCAR,
  //               6 for Indycar, 7 for Esports, 8 for Open wheel, 9 for Enduro, 10 for Stock,
  //               11 for Drag, 12 for Rally, 13 for Off-road, 14 for Touring, 15 for Moto GP,
  //               16 for Motocross, 17 for Other

  // region: 1 for world and 2 for nz

  const post = {
    id: uuid(),
    postId: id,
    createdAt: new Date().toISOString(),
    source: reqBody.source,
    author: reqBody.author,
    title: reqBody.title,
    description: reqBody.description,
    url: reqBody.url,
    imageVer: reqBody.imageVer,
    imageHor: reqBody.imageHor,
    publishedAt: reqBody.publishedAt,
    body: reqBody.body,
    appCategory: reqBody.appCategory,
    newsCategory: reqBody.newsCategory,
    region: reqBody.region,
  };

  id++;

  return db
    .put({
      TableName: postsTable,
      Item: post,
    })
    .promise()
    .then(() => {
      callback(null, response(201, post));
    })
    .catch((err) => response(null, response(err.statusCode, err)));
};
// Get all posts
module.exports.getAllPosts = (event, context, callback) => {
  return db
    .scan({
      TableName: postsTable,
    })
    .promise()
    .then((res) => {
      callback(null, response(200, res.Items.sort(sortByDate)));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};
// Get number of posts
module.exports.getPosts = (event, context, callback) => {
  const numberOfPosts = event.pathParameters.number;
  const params = {
    TableName: postsTable,
    Limit: numberOfPosts,
  };
  return db
    .scan(params)
    .promise()
    .then((res) => {
      callback(null, response(200, res.Items.sort(sortByDate)));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};
// Get a single post
module.exports.getPost = (event, context, callback) => {
  const id = event.pathParameters.id;

  const params = {
    Key: {
      id: id,
    },
    TableName: postsTable,
  };

  return db
    .get(params)
    .promise()
    .then((res) => {
      if (res.Item) callback(null, response(200, res.Item));
      else callback(null, response(404, { error: "Post not found" }));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};
// Update a post
module.exports.updatePost = (event, context, callback) => {
  const id = event.pathParameters.id;
  const reqBody = JSON.parse(event.body);
  const { body, title } = reqBody;

  const params = {
    Key: {
      id: id,
    },
    TableName: postsTable,
    ConditionExpression: "attribute_exists(id)",
    UpdateExpression: "SET title = :title, body = :body",
    ExpressionAttributeValues: {
      ":title": title,
      ":body": body,
    },
    ReturnValues: "ALL_NEW",
  };
  console.log("Updating");

  return db
    .update(params)
    .promise()
    .then((res) => {
      console.log(res);
      callback(null, response(200, res.Attributes));
    })
    .catch((err) => callback(null, response(err.statusCode, err)));
};
// Delete a post
module.exports.deletePost = (event, context, callback) => {
  const id = event.pathParameters.id;
  const params = {
    Key: {
      id: id,
    },
    TableName: postsTable,
  };
  return db
    .delete(params)
    .promise()
    .then(() =>
      callback(null, response(200, { message: "Post deleted successfully" }))
    )
    .catch((err) => callback(null, response(err.statusCode, err)));
};
