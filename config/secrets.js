module.exports = {

  db: process.env.MONGODB|| 'mongodb://localhost:27017/vdigest',

  betaPW: process.env.BETA_PASSWORD || "somepw",

  sessionSecret: process.env.SESSION_SECRET || "somesessionsecret",

  adminEmail: "amypavel@gmail.com",
};
