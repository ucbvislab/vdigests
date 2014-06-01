/**
 * GET /editing-interface
 * Video digest editing interface
 */

exports.editor = function(req, res) {
  res.render('editor', {
    title: 'Video Digest Editor'
  });
};
