'use strict';

const storage    = require('../storage'),
      thumbnail  = require('../helper').thumbnail;


function getDocumentContainerName(doc) {
  return storage.getContainerName(doc.owner, 'documents', doc.id, 'files');
}

/**
 * cwAttachment services.
 * @module attachment.service
 */
const AttachmentService = {};

/**
 * Get attachment meta.
 * @param {Object}  doc  Document
 * @param {Object}  att  Attachment
 * @return {Object} attachment meta
 */
AttachmentService.meta = function(doc, att) {
  const container = getDocumentContainerName(doc);
  return storage.info(container, att.key)
    .then(function(infos) {
      if (!infos) {
        return Promise.reject(`Attachment ${att.key} file not found!`);
      }
      return Promise.resolve({
        path: infos.path,
        driver: infos.driver,
        contentLenght: infos.size,
        contentType: att.contentType,
        lastModified: infos.mtime.toUTCString()
      });
    });
};

/**
 * Get attachment meta.
 * @param {Object}  doc  Document
 * @param {Object}  att  Attachment
 * @return {Object} attachment meta
 */
AttachmentService.available = function(doc, att) {
  const container = getDocumentContainerName(doc);
  return storage.info(container, att.key)
    .then(function(infos) {
      if (!infos) {
        return Promise.resolve(false);
      } else {
        return Promise.resolve(true);
      }
    });
};

/**
 * Get an attachment file.
 * @param {Object}  doc  Document
 * @param {Object}  att  Attachment
 * @param {Integer} size Thumbnail size
 * @return {Object} the thumbnail file path
 */
AttachmentService.getThumbnail = function(doc, att, size) {
  const container = getDocumentContainerName(doc);
  return this.meta(doc, att)
    .then(function(metas) {
      // Get a local copy of the file (it's a noop if the driver is 'local')
      return storage.localCopy(container, att.key)
        .then(function(localPath) {
          return thumbnail.file(localPath, size, doc.id);
        }).then(function(thumbPath) {
          // Remove copied file only if driver is not 'local'
          if (metas.driver !== 'local') {
            storage.localRemove(container, att.key);
          }
          return Promise.resolve(thumbPath);
        });
    });
};

/**
 * Get attachment stream.
 * @param {Object}  doc  Document
 * @param {Object}  att  Attachment
 * @return {Object} the Attachment stream
 */
AttachmentService.stream = function(doc, att) {
  const container = getDocumentContainerName(doc);
  return this.meta(doc, att)
    .then(function(metas) {
      return storage.stream(container, att.key)
        .then(function(s) {
          metas.stream = s;
          return Promise.resolve(metas);
        });
    });
};

module.exports = AttachmentService;
