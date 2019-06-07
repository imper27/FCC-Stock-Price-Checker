/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {

//   NOTE: Run all tests.  The last one will clear the database.
//    If you don't run all tests, then clear the database after,
//    that is, remove AAPL and VRSN, or run
//    db.likes.remove({ip_address: "192.168.2.1"}, {$multi:true})
    suite('GET /api/stock-prices => stockData object', function() {

      test('1 stock', function(done) {
       chai.request(server)
        .get('/api/stock-prices')
        .set('X-Forwarded-For', '192.168.2.1')
        .query({ stock: 'aapl' })
        .end(function(error, response){
               assert.equal(response.status, 200);
               const stockData = response.body.stockData;
               assert.isDefined(stockData);
               assert.equal(stockData.stock, 'AAPL');
               assert.isDefined(stockData.price);
               assert.isAtLeast(stockData.likes, 0);
               done();
        });
      });
      
      test('1 stock with like', function(done) {
              chai.request(server)
               .get('/api/stock-prices')
               .query({ stock: 'aapl', like: true })
                .set('X-Forwarded-For', '192.168.2.1')
               .end(function(error, response){
                      assert.equal(response.status, 200);
                      const stockData = response.body.stockData;
                      assert.isDefined(stockData);
                      assert.equal(stockData.stock, 'AAPL');
                      assert.isDefined(stockData.price);
                      assert.equal(stockData.likes, 1);
                      done();
               });
      });

      test('1 stock with like again (ensure likes arent double counted)', function(done) {
              chai.request(server)
               .get('/api/stock-prices')
                .set('X-Forwarded-For', '192.168.2.1')
               .query({ stock: 'aapl', like: true })
               .end(function(error, response){
                      assert.equal(response.status, 200);
                      const stockData = response.body.stockData;
                      assert.isDefined(stockData);
                      assert.equal(stockData.stock, 'AAPL');
                      assert.isDefined(stockData.price);
                      assert.equal(stockData.likes, 1);
                      done();
               });
      });

      test('2 stocks', function(done) {
              chai.request(server)
               .get('/api/stock-prices')
                .set('X-Forwarded-For', '192.168.2.1')
               .query({ stock: ['aapl', 'vrsn'] })
               .end(function(error, response){
                      assert.equal(response.status, 200);
                      const stockData = response.body.stockData;
                      assert.isDefined(stockData);
                      assert.equal(stockData[0].stock, 'AAPL');
                      assert.isDefined(stockData[0].price);
                      assert.equal(stockData[0].rel_likes, 1);
                      assert.equal(stockData[1].stock, 'VRSN');
                      assert.isDefined(stockData[1].price);
                      assert.equal(stockData[1].rel_likes, -1);
                      done();
               });
      });
      
      test('2 stocks with like', function(done) {
              chai.request(server)
               .get('/api/stock-prices')
                .set('X-Forwarded-For', '192.168.2.1')
               .query({ stock: ['aapl', 'vrsn'], like: true })
               .end(function(error, response){
                      assert.equal(response.status, 200);
                      const stockData = response.body.stockData;
                      assert.isDefined(stockData);
                      assert.equal(stockData[0].stock, 'AAPL');
                      assert.isDefined(stockData[0].price);
                      assert.equal(stockData[0].rel_likes, 0);
                      assert.equal(stockData[1].stock, 'VRSN');
                      assert.isDefined(stockData[1].price);
                      assert.equal(stockData[1].rel_likes, 0);
                      chai.request(server)
                       .delete('/api/stock-prices')
                       .send({ ip_address: '192.168.2.1' })
                       .end((error, result) => {
                               done();
                       });
               });
      });

    });

});
