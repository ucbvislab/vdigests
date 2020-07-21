const { Sequelize }  = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'local-database.sqlite',
    logging: false
});

module.exports = sequelize;