'use strict';

/*jshint -W030 */ 

var app = require('../../src/app'),
    chance  = require('chance').Chance(),
    expect  = require('chai').expect,
    request = require('supertest');


const expectDocument = function(doc, expected) {
  //console.log('ACTUAL', doc);
  expect(doc).to.contain.keys(
      'id', 'title', 'content', 'contentType', 'date', 'labels', '_links'
      );
  if (expected) {
    const doNotCompare = ['_links', 'date', 'attachments', 'labels'];
    //console.log('EXPECTED', expected);
    for (let prop in expected) {
      if (expected.hasOwnProperty(prop)) {
        if (doNotCompare.indexOf(prop) < 0) {
          expect(doc[prop]).to.equals(expected[prop]);
        }
      }
    }
  }
};

module.exports = function() {
  this.When(/^I create the following document:$/, function (attrs, callback) {
    const doc = {
      title: chance.sentence({words: 3})
    };
    attrs.raw().forEach(function(attr) {
      const prop = attr[0], value = attr[1];
      if (prop === 'files' || prop === 'labels') {
        if (doc[prop]) {
          doc[prop].push(value);
        } else {
          doc[prop] = [value];
        }
      } else {
        doc[prop] = value;
      }
    });
    const req = request(app).post('/v2/document');
    if (doc.files) {
      const files = doc.files;
      delete doc.files;
      req.field('document', JSON.stringify(doc));
      files.forEach(function(file) {
        req.attach('files', file);
      });
    } else {
      req.send(doc).set('Content-Type', 'application/json');
    }
    req.set('X-Api-Token', this.token)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        expect(res.status).to.equals(201);
        const newDoc = res.body;
        expectDocument(newDoc, doc);
        expect(newDoc.date).not.to.be.null;
        this.myDocument = newDoc;
      }.bind(this))
    .end(callback);
  });

  this.When(/^I update the document with:$/, function (attrs, callback) {
    expect(this.myDocument).to.not.be.undefined;
    const update = {};
    attrs.raw().forEach(function(attr) {
      const prop = attr[0], value = attr[1];
      update[prop] = value;
    });
    request(app)
      .put('/v2/document/' + this.myDocument.id)
      .send(update)
      .set('Content-Type', 'application/json')
      .set('X-Api-Token', this.token)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        expect(res.status).to.equals(200);
        const updatedDoc = res.body;
        expectDocument(updatedDoc, update);
        expect(updatedDoc.date).not.to.be.null;
        this.myDocument = updatedDoc;
      }.bind(this))
    .end(callback);
  });

  this.When(/^I delete the document$/, function (callback) {
    expect(this.myDocument).to.not.be.undefined;
    request(app)
      .delete('/v2/document/' + this.myDocument.id)
      .set('Content-Type', 'application/json')
      .set('X-Api-Token', this.token)
      .expect(204, callback);
  });


  this.Then(/^I should (not retrieve|retrieve) the document$/, function (get, callback) {
    expect(this.myDocument).to.not.be.undefined;
    const shoulBeRetrieve = get === 'retrieve';
    request(app)
      .get('/v2/document/' + this.myDocument.id)
      .set('Content-Type', 'application/json')
      .set('X-Api-Token', this.token)
      .expect('Content-Type', /json/)
      .expect(function(res) {
        if (shoulBeRetrieve) {
          expect(res.status).to.equals(200);
          const doc = res.body;
          expectDocument(doc, this.myDocument);
        } else {
          expect(res.status).to.be.within(401, 404);
        }
      }.bind(this))
    .end(callback);
  });

  this.Then(/^I should have "([^"]*)" into the document (title|content|contentType)$/, function (value, attr, callback) {
    expect(this.myDocument).to.not.be.undefined;
    expect(this.myDocument[attr]).to.equals(value);
    callback();
  });

};
