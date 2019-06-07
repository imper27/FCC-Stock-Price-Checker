/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

'use strict';

const expect = require('chai').expect;
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const CONNECTION_STRING = process.env.DB;
//Example connection: MongoClient.connect(CONNECTION_STRING, function(err, db) {});

const mongoose = require('mongoose');
mongoose.connect(CONNECTION_STRING, {
        useNewUrlParser: true,
        useFindAndModify: false
});

const axios = require("axios");

const Schema = mongoose.Schema;
const likeSchema = new Schema({
        stock: { type: String, required: true },
        ip_address: { type: String, required: true }
});

const Like = mongoose.model('Like', likeSchema, 'likes');

function getIpAddress(request) {
        let ipAddress;
        let forwardedFor = request.headers['x-forwarded-for'];
        if (forwardedFor) {
                let commaIndex = forwardedFor.indexOf(',');
                if (commaIndex > 0) {
                        ipAddress =  forwardedFor.substring(0, commaIndex);
                } else {
                        ipAddress =  forwardedFor;
                }
        } else {
                ipAddress = request.connection.remoteAddress;
        }

        if (ipAddress.includes('::ffff:')) {
                ipAddress = ipAddress.substring(7);
        }

        return ipAddress;
}

function getCloseURL(stockName) {
        const start = 'https://cloud.iexapis.com/stable/stock/';
        const end = '/quote?filter=close&token=' + process.env.IEXCLOUD;
        return start + stockName + end;
}

function checkError(error) {
        return error.response.data == 'Unknown symbol';
}

module.exports = function(app) {
  
          app.route('/api/stock-prices')
                .get((request, response) => {
                        const ip_address = getIpAddress(request);
                        // const ip_address = request.ip;
                        const stockInput = request.query.stock;
                        const likeRequest = request.query.like;
                        if (!Array.isArray(stockInput)) {
                                const stock = stockInput.toUpperCase();
                                const stockData = { stock };
                                const closeURL = getCloseURL(stock);
                                axios.get(closeURL)
                                .then(closeResponse => {
                                        stockData.price = closeResponse.data.close;
                                        let promise = likeRequest? Like.countDocuments({ stock, ip_address }).exec(): Promise.resolve(-1);
                                        return promise;
                                })
                                .then(count => {
                                        if (count == 0) {
                                                let likeDocument = new Like({ stock, ip_address });
                                                return likeDocument.save();
                                        }

                                        return Promise.resolve(0);
                                })
                                .then( doc => {
                                        return Like.countDocuments({ stock }).exec();
                                })
                                .then( count => {
                                        stockData.likes = count;
                                        response.json({ stockData });
                                })
                                .catch(error => {
                                        if (checkError(error)) {
                                                response.status(400).send('unkonwn stock');
                                        } else {
                                                console.log(error);
                                                response.status(500).send('please try again later');
                                        }

                                });
                        } else {
                                const stock1 = stockInput[0].toUpperCase();
                                const stockData1 = { stock: stock1 };
                                const stock2 = stockInput[1].toUpperCase();
                                const stockData2 = { stock: stock2 };
                                const closeURL1 = getCloseURL(stock1);
                                const closeURL2 = getCloseURL(stock2);
                                let promise1 = axios.get(closeURL1);
                                let promise2 = axios.get(closeURL2);
                                Promise.all([promise1, promise2])
                                .then( ([closeResponse1, closeResponse2]) => {
                                        stockData1.price = closeResponse1.data.close;
                                        stockData2.price = closeResponse2.data.close;
                                        promise1 = likeRequest? Like.countDocuments({ stock: stock1, ip_address }).exec(): Promise.resolve(-1);
                                        promise2 = likeRequest? Like.countDocuments({ stock: stock2, ip_address }).exec(): Promise.resolve(-1);

                                        return Promise.all([promise1, promise2]);
                                })
                                .then( ([count1, count2]) => {
                                        promise1 = count1 == 0? new Like({ stock: stock1, ip_address }).save(): Promise.resolve(0);
                                        promise2 = count2 == 0? new Like({ stock: stock2, ip_address }).save(): Promise.resolve(0);

                                        return Promise.all([promise1, promise2]);
                                })
                                .then( docs =>  {
                                        promise1 = Like.countDocuments({ stock: stock1 }).exec();
                                        promise2 = Like.countDocuments({ stock: stock2 }).exec();

                                        return Promise.all([promise1, promise2]);
                                })
                                .then( ([count1, count2]) => {
                                        const difference = count1 - count2;
                                        stockData1.rel_likes = difference;
                                        stockData2.rel_likes = -difference;
                                        const stockData = [stockData1, stockData2];
                                        response.json({ stockData });
                                })
                                .catch(error => {
                                        if (checkError(error)) {
                                                response.status(400).send('unknown stock');
                                        } else {
                                                console.log(error);
                                                response.status(500).send('please try again later');
                                        }

                                });
                        }
                })
  
                // For testing, to clean up after.
                .delete((request, response) => {
                        const ip_address = request.body.ip_address;
                        Like.deleteMany( { ip_address }, (error) => {
                                if (error) {
                                        console.log(error.message);
                                        return response.status(500).send('Please try later');
                                }

                                response.json( { ip_address });
                        })
                });

};