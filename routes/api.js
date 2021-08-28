'use strict';

const ObjectId = require('mongodb').ObjectId;

module.exports = function(app, myDataBase) {

  app.route('/api/threads/:board')
    .get(function(req, res) {
      const agg = [
        {
          '$match': {
            'board': req.params.board
          }
        }, {
          '$sort': {
            'bumped_on': 1
          }
        }, {
          '$limit': 10
        }, {
          '$project': {
            'reported': 0,
            'delete_password': 0,
            'replies.delete_password': 0,
            'replies.reported': 0
          }
        }
      ];
      myDataBase.aggregate(agg)
        .toArray()
        .then(data => {
          const result = data.map(thread => {
            thread.replies = thread.replies
              .sort(function(a, b) {
                return a.created_on > b.created_on ? -1 : 1;
              })
              .slice(0, 3);
            return thread;
          })
          res.json(result)
        });


    })
    .post(async function(req, res) {
      const insertOneResult = await myDataBase.insertOne({
        ...req.body,
        ...req.params,//board
        created_on: new Date(),
        bumped_on: new Date(),
        reported: false,
        replies: []
      })
      res.redirect(`/b/${req.params.board}/`)

    })
    .put(async function(req, res) {
      const filter = {
        _id: new ObjectId(req.body.thread_id),
      }
      const update = { $set: { reported: true } }

      const updateResult = await myDataBase.updateOne(filter, update);

      if (updateResult.matchedCount === 0)
        res.send('incorrect thread_id')
      else if (updateResult.modifiedCount === 1)
        res.send('success')
    })
    .delete(function(req, res) {

      const {

        thread_id,
        delete_password,
      } = req.body;
      const filter = {
        ...req.params,
        _id: new ObjectId(thread_id),
        delete_password
      }
      myDataBase.findOneAndDelete(filter, (err, deleteResult) => {
        if (deleteResult.value === null)
          res.send('incorrect password')
        else if (deleteResult.lastErrorObject.n === 1)
          res.send('success')
      })
    })



  app.route('/api/replies/:board')
    .get(function(req, res) {

      const agg = [
        {
          '$match': {
            '_id': new ObjectId(req.query.thread_id),
            'board': req.params.board
          }
        }, {
          '$project': {
            'board': 0,
            'reported': 0,
            'delete_password': 0,
            'replies.delete_password': 0,
            'replies.reported': 0
          }
        }
      ];
      myDataBase.aggregate(agg)
        .toArray()
        .then(data => {
          res.json(...data);
        })

    })
    .post(function(req, res) {
      const { board, thread_id, text, delete_password } = req.body
      let newReply = {
        _id: new ObjectId(),
        text,
        delete_password,
        created_on: new Date(),
        reported: false
      }
      const filter = { _id: new ObjectId(thread_id) }
      const update = {
        $set: { bumped_on: new Date() },
        $push: { replies: newReply }
      }
      const options = { returnNewDocument: true }
      myDataBase.findOneAndUpdate(filter, update, options, (err, result) => {
        if (err) {
          res.send("error");
        }
        res.redirect(`/b/${req.params.board}/${thread_id}`)

      })
    })
    .delete(async function(req, res) {
      // we r not asked to test if it already deleted  no need to handel that in this case .
      const {
        thread_id,
        reply_id,
        delete_password,
      } = req.body;
      const filter = {
        _id: new ObjectId(thread_id),
        'replies._id': new ObjectId(reply_id),
        'replies.delete_password': delete_password
      }
      const update = { $set: { 'replies.$.text': '[deleted]' } }

      const updateResult = await myDataBase.updateOne(filter, update);

      if (updateResult.matchedCount === 0)
        res.send('incorrect password')
      else if (updateResult.modifiedCount === 1)
        res.send('success')
    })
    .put(async function(req, res) {
      const {
        thread_id,
        reply_id,
      } = req.body;
      const filter = {
        _id: new ObjectId(thread_id),
        'replies._id': new ObjectId(reply_id)
      }
      const update = { $set: { 'replies.$.reported': true } }

      const updateResult = await myDataBase.updateOne(filter, update);

      if (updateResult.matchedCount === 0)
        res.send('incorrect thread_id')
      else if (updateResult.modifiedCount === 1)
        res.send('success')
    });

  //404 Not Found Middleware
  app.use(function(req, res, next) {
    res.status(404)
      .type('text')
      .send('Not Found');
  });

};
