var secrets = require('../config/secrets');
var nodemailer = require('nodemailer');
var smtpTransport = nodemailer.createTransport('SMTP', {
  service: 'Mailgun',
  auth: {
    user: secrets.mailgun.user,
    pass: secrets.mailgun.password,
  },
});

/**
 * GET /contact
 * Contact form page.
 */

exports.getContact = function (req, res) {
  res.render('contact', {
    title: 'Contact',
  });
};

/**
 * POST /contact
 * Send a contact form via Nodemailer.
 * @param email
 * @param name
 * @param message
 */

exports.postContact = function (req, res) {
  req.assert('name', 'Name cannot be blank').notEmpty();
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('message', 'Message cannot be blank').notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/contact');
  }

  var from = req.body.email;
  var name = req.body.name;
  var body = req.body.message;
  var to = secrets.adminEmail;
  var subject = 'Video Digest Feedback';

  var mailOptions = {
    to: to,
    from: from,
    subject: subject,
    text: body,
  };

  smtpTransport.sendMail(mailOptions, function (err) {
    if (err) {
      req.flash('errors', { msg: err.message });
      return res.redirect('/contact');
    }
    req.flash('success', { msg: 'Email has been sent successfully!' });
    res.redirect('/contact');
  });
};
