
var VDigest = require('../models/VDigest');

/**
 * GET /contact
 * Contact form page.
 */
exports.getVDList = function(req, res) {

VDigest.find({}, "pubdisplay puburl digest.title", function (err, vds) {
  res.render('vdlist', {
    title: 'Video Digests',
    vds: vds
  });
});
};
