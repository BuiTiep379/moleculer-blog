const { Sequelize } = require("sequelize");
const userModel = {
	name: "user",
	define: {
		// allowNull defaults to true
		firstName: {
			allowNull: false,
			type: Sequelize.STRING,
		},
		middleName: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		lastName: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		email: {
			type: Sequelize.STRING,
			allowNull: false,
			unique: true,
		},
		passwordHash: {
			type: Sequelize.STRING,
			allowNull: false,
		},
		role: {
			type: Sequelize.STRING,
			defaultValue: "User",
		},
	},
};
module.exports = userModel;
