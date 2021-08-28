const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

let testThread;
let testReplyThread;
let testReply;

chai.request(server)
  .post('/api/threads/testreplythread')
  .set('content-type', 'application/json')
  .send({ text: 'test Reply Thread', delete_password: 'pw' })
  .end((err, response) => {
    if (err) throw err
    assert.equal(response.status, 200);
    assert.include(response.redirects[0], '/b/testreplythread');

  })

chai.request(server)
  .get('/api/threads/testreplythread')
  .set('content-type', 'application/json')
  .send({ text: 'test Reply Thread', delete_password: 'pw' })
  .end((err, response) => {
    if (err) throw err

    testReplyThread = response.body[0]._id

  })

suite('Functional Tests', function() {
  suite('API ROUTING FOR /api/threads/:board', function() {

    test('Creating a new thread: POST request to /api/threads/{board}', done => {
      chai.request(server)
        .post('/api/threads/test_board')
        .set('content-type', 'application/json')
        .send({ text: 'test_thread', delete_password: 'pw' })
        .end((err, response) => {
          if (err) throw err
          assert.equal(response.status, 200);
          assert.include(response.redirects[0], '/b/test_board');
          done();
        })
    });
    test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', done => {
      chai.request(server)
        .get('/api/threads/test_board')
        .set('content-type', 'application/json')
        .send({ text: 'test_thread', delete_password: 'pw' })
        .end((err, response) => {
          if (err) throw err
          assert.equal(response.status, 200);
          assert.isArray(response.body);
          assert.isAtMost(response.body.length, 10);
          assert.isObject(response.body[0]);
          assert.property(response.body[0], 'text');
          assert.property(response.body[0], '_id');
          assert.property(response.body[0], 'created_on');
          assert.property(response.body[0], 'bumped_on');
          assert.property(response.body[0], 'board');
          assert.property(response.body[0], 'replies');
          assert.notProperty(response.body[0], 'reported');
          assert.notProperty(response.body[0], 'delete_password');
          assert.isArray(response.body[0].replies);
          assert.isAtMost(response.body[0].replies.length, 3);
          testThread = response.body[0]._id
          done();
        })

    });
    test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
      chai.request(server)
        .put('/api/threads/test_board')
        .send({ thread_id: testThread })
        .end(function(err, response) {

          assert.equal(response.status, 200);
          assert.equal(response.text, 'success');
          done();
        });
    });
    test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board} with an invalid delete_password', function(done) {
      chai.request(server)
        .delete('/api/threads/test_board')
        .send({ thread_id: testThread, delete_password: 'badpw' })
        .end(function(err, response) {

          assert.equal(response.status, 200);
          assert.equal(response.text, 'incorrect password');

          done();
        });

    })
    test('Deleting a thread with the correct password: DELETE request to /api/threads/{board} with a valid delete_password', function(done) {
      chai.request(server)
        .delete('/api/threads/test_board')
        .send({ thread_id: testThread, delete_password: 'pw' })
        .end(function(err, response) {
          assert.equal(response.status, 200);
          assert.equal(response.text, 'success');
          done();
        });

    })
  });

  suite('API ROUTING FOR /api/replies/:board', function() {

    console.log(testReplyThread)
    test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
      chai.request(server)
        .post('/api/replies/testreplythread')
        .send({ text: 'test_reply', delete_password: 'pw', thread_id: testReplyThread })
        .end(function(err, response) {
          console.log('fuck')
          // console.log(response)
          assert.equal(response.status, 200);
          assert.include(response.redirects[0], `/b/testreplythread/${testReplyThread}`);
          done();
        });
    });

    test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
      chai.request(server)
        .get('/api/replies/testreplythread')
        .query({ thread_id: testReplyThread })
        .end(function(err, response) {

          assert.equal(response.status, 200);
          assert.isObject(response.body);
          assert.property(response.body, 'text');
          assert.property(response.body, '_id');
          assert.property(response.body, 'created_on');
          assert.property(response.body, 'bumped_on');
          assert.property(response.body, 'replies');
          assert.isArray(response.body.replies);
          assert.isAtLeast(response.body.replies.length, 1);
          assert.notProperty(response.body, 'reported');
          assert.notProperty(response.body, 'delete_password');

          testReply = response.body.replies[0]._id

          done();
        });
    });

    console.log(testReply)

    test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
      chai.request(server)
        .put('/api/replies/testreplythread')
        .send({ reply_id: testReply, thread_id: testReplyThread })
        .end(function(err, response) {

          assert.equal(response.status, 200);
          assert.equal(response.text, 'success');

          done();
        });
    });

    test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board} with an invalid delete_password', function(done) {
      chai.request(server)
        .delete('/api/replies/testreplythread')
        .send({ thread_id: testReplyThread, reply_id: testReply, delete_password: 'badpw' })
        .end(function(err, response) {

          assert.equal(response.status, 200);
          assert.equal(response.text, 'incorrect password');

          done();
        });
    });
    test('Deleting a reply with the correct password: DELETE request to /api/replies/{board} with a valid delete_password', function(done) {
      chai.request(server)
        .delete('/api/replies/testreplythread')
        .send({ thread_id: testReplyThread, reply_id: testReply, delete_password: 'pw' })
        .end(function(err, response) {

          assert.equal(response.status, 200);
          assert.equal(response.text, 'success');

          done();
        });
    });
  });
})
