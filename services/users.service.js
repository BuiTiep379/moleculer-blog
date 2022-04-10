const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const DbService = require("moleculer-db");
const userModel = require("../models/user.model");
const _ = require("lodash");
const { Create, Response, InputError } = require("../lib/response");
const { QueryTypes } = require("sequelize");
const Redis = require("ioredis");
const redis = new Redis();
module.exports = {
	name: "users",
	mixins: [DbService],
	adapter: new SqlAdapter("blog_api", "user-dev", "moleculer", {
		host: "localhost",
		dialect: "mysql",
	}),
	model: userModel,
	settings: {
		/** Public fields */
		fields: ["firstName", "middleName", "lastName", "email"],
	},

	hooks: {
		after: {
			signup: function (ctx, res) {
				delete res.data.dataValues.passwordHash;
				return res;
			},
		},
	},

	actions: {
		signup: {
			rest: "POST /signup",
			params: {
				firstName: "string",
				middleName: "string",
				lastName: "string",
				email: "email",
				password: "string|min:6",
			},
			hooks: {
				before(ctx) {
					ctx.params.passwordHash = this.hashPassword(
						ctx.params.password
					);
					return ctx;
				},
			},
			async handler(ctx) {
				const entity = ctx.params;
				// console.log("entity", entity.email);
				const entityExists = await this.adapter.findOne({
					where: {
						email: entity.email,
					},
				});
				if (entityExists) {
					return InputError(ctx, {
						message: "Email already register",
					});
				}
				const user = await this.adapter.insert(entity);

				return Create(ctx, "Sign up successfully", user);
			},
		},
		signin: {
			rest: "POST /signin",
			params: {
				email: "email",
				password: "string|min:6",
			},

			async handler(ctx) {
				const entity = ctx.params;
				const entityExists = await this.adapter.findOne({
					where: {
						email: entity.email,
					},
				});
				if (!entityExists) {
					return InputError(ctx, { message: "Email not registered" });
				}
				const user = entityExists.dataValues;
				const checkPassword = this.comparePassword(
					user.passwordHash,
					entity.password
				);
				if (!checkPassword) {
					return InputError(ctx, { message: "Wrong password" });
				}
				ctx.params.userId = user.id;
				const permissions = await this.getPermission(user.id);
				const payload = {
					permissions,
					userId: user.id,
					role: user.role,
				};
				const token = this.generateJWT(payload);
				const timestamps = new Date();
				const tokenRedis = {
					token,
					createdAt: timestamps,
					updatedAt: timestamps,
				};
				const tlt = 60 * 60;
				await redis.setex(user.id, tlt, JSON.stringify(tokenRedis));
				return Response(ctx, { data: { token } });
			},
		},
		resolveToken: {
			params: {
				token: "string",
			},
			handler(ctx) {
				const decode = jwt.verify(
					ctx.params.token,
					process.env.JWT_SECRET
				);
				return decode;
			},
		},
	},
	methods: {
		hashPassword(password) {
			const salt = bcrypt.genSaltSync(10);
			const hash = bcrypt.hashSync(password, salt);
			return hash;
		},
		comparePassword(passwordHash, password) {
			const check = bcrypt.compareSync(password, passwordHash);
			return check;
		},
		//  * Generate a JWT token from user entity
		generateJWT(user) {
			const token = jwt.sign(
				{
					data: user,
				},
				process.env.JWT_SECRET,
				{ expiresIn: process.env.JWT_EXPIRES }
			);
			return token;
		},
		async getPermission(userId) {
			const document = await this.adapter.db.query(
				"SELECT resource, action FROM permissions, user_permissions WHERE user_permissions.user_id = :userId AND user_permissions.permission_id=permissions.id",
				{
					replacements: { userId },
					type: QueryTypes.SELECT,
				}
			);
			let permission = {};
			_.forEach(document, (value) => {
				const resource = value.resource;
				const action = value.action;
				permission[resource]
					? permission[resource].push(action)
					: (permission[resource] = [action]);
			});
			return permission;
		},
	},
};
