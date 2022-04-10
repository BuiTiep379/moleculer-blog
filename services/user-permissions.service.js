const SqlAdapter = require("moleculer-db-adapter-sequelize");
const DbService = require("moleculer-db");
const { QueryTypes } = require("sequelize");
const userPermission = require("../models/user-permission.model");
const authentication = require("../middlewares/authentication");
const { Create, Delete, InputError, NotFound } = require("../lib/response");
module.exports = {
	name: "user-permissions",
	mixins: [DbService, authentication],
	adapter: new SqlAdapter("blog_api", "user-dev", "moleculer", {
		host: "localhost",
		dialect: "mysql",
	}),
	model: userPermission,
	// hooks: {
	// 	before: {
	// 		"*": (req, res) => {
	// 			console.log("res", res);
	// 			console.log("req", req);
	// 			return;
	// 		},
	// 	},
	// },
	actions: {
		create: {
			path: "POST /:userId",
			auth: "required",
			params: {
				userId: "string",
				permissionId: "number",
			},
			// chưa có khóa ngoại chưa check đc
			async handler(ctx) {
				let { userId, permissionId } = ctx.params;
				const permissionExists = await this.adapter.findOne({
					where: { user_id: userId, permission_id: permissionId },
				});
				if (!permissionExists) {
					const data = await this.adapter.insert({
						user_id: Number(userId),
						permission_id: permissionId,
					});
					return Create(ctx, null, data);
				} else {
					return InputError(ctx, {
						message: "Permission already exists",
					});
				}
			},
		},
		delete: {
			path: "DELETE /:userId",
			auth: "required",
			params: {
				userId: "string",
				permissionId: "number",
			},
			async handler(ctx) {
				let { userId, permissionId } = ctx.params;
				const permissionExists = await this.adapter.findOne({
					where: {
						user_id: Number(userId),
						permission_id: permissionId,
					},
				});
				if (!permissionExists) {
					return NotFound(ctx, "Permission");
				}
				await this.adapter.db.query(
					"DELETE FROM user_permissions WHERE user_id = ? AND permission_id= ?",
					{
						replacements: [Number(userId), permissionId],
						type: QueryTypes.DELETE,
					}
				);
				return Delete(ctx, permissionExists.dataValues);
			},
		},
	},
	methods: {
		async findExistsPermission(userId, permissionId) {
			const data = await this.adapter.db.query(
				"SELECT * FROM user_permissions WHERE user_id =? AND permission_id=?",
				{
					replacements: [userId, permissionId],
					type: QueryTypes.SELECT,
				}
			);
			console.log("data", data);
			if (data.length == 0) {
				return null;
			}
			return data;
		},
	},
};
