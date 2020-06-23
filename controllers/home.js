/**
 * GET /
 * Home page.
 */

exports.index = function(req, res) {
  res.render('coming-soon', {
    title: 'Home'
  });
};

exports.tutorial = function(req, res) {
  res.render('tutorial', {
    title: 'Video Digest Tutorial'
  });
};
