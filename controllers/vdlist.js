var VDigest = require('../models/VDigest');

/**
 * GET /contact
 * Contact form page.
 */
exports.getVDList = function (req, res) {
  VDigest.find({ pubdisplay: true }, 'puburl digest.title')
    .sort('-uploadDate')
    .limit(20)
    .exec(function (err, vds) {
      res.render('vdlist', {
        title: 'Video Digests',
        vds: vds,
      });
    });
};
