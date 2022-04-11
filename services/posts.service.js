const postModel = require("../models/post.model");
const SqlAdapter = require("moleculer-db-adapter-sequelize");
const DbService = require("moleculer-db");
const { QueryTypes } = require("sequelize");
const _ = require("lodash");
const {
	Get,
	Create,
	Update,
	Delete,
	NotFound,
	Response,
	BadRequest,
} = require("../lib/response");
const getPagingData = require("../lib/pagination");
const Redis = require("ioredis");
const redis = new Redis();
const ONE_DAY = 24 * 60 * 60;
module.exports = {
	name: "posts",
	mixins: [DbService],
	adapter: new SqlAdapter("blog_api", "user-dev", "moleculer", {
		host: "localhost",
		dialect: "mysql",
	}),
	model: postModel,
	settings: {
		fields: ["id", "title", "content"],
	},
	actions: {
		list: {
			rest: "GET /",

			auth: "required",
			async handler(ctx) {
				const postRedis = await redis.get("post");
				let data = JSON.parse(postRedis);
				const page = Number(ctx.params.page) || 1;
				const limit = Number(ctx.params.size) || 10;
				if (!data) {
					data = await this.adapter.db.query(
						`SELECT p.id, p.title, p.content, U.firstName, U.email
					FROM posts as P, users as U
					WHERE U.id = P.authorId;`,
						{
							type: QueryTypes.SELECT,
						}
					);

					if (data.length == 0) {
						throw NotFound("Posts");
					}
					data = this.refactorPosts(data);
					await redis.setex("posts", ONE_DAY, JSON.stringify(data));
				}
				data = getPagingData(data, page, limit);
				// const data = await this.adapter.db.query(
				// 	`SELECT p.id, p.title, p.content, U.firstName, U.email
				// 		FROM posts as P, users as U
				// 		WHERE U.id = P.authorId LIMIT ?, ?`,
				// 	{
				// 		type: QueryTypes.SELECT,
				// 		replacements: [offset, limit],
				// 	}
				// );
				return Get(ctx, data);
			},
		},
		// hooks in action level
		create: {
			auth: "required",
			rest: "POST /",
			params: {
				title: "string",
				content: "string",
			},
			async handler(ctx) {
				// const { title, content } = ctx.params;
				const { userId: authorId } = ctx.meta.user;
				const post = await this.adapter.insert({
					...ctx.params,
					authorId,
				});
				// await this.saveCategoriesInRedis();
				return Create(ctx, null, post);
			},
		},
		get: {
			rest: "GET /:id",
			auth: "required",
			params: {
				id: { type: "string" },
			},
			async handler(ctx) {
				const { id } = ctx.params;
				const data = await this.getSinglePost(id);
				if (data) {
					const { id, title, content, firstName, email } = data[0];
					const post = {
						id,
						title,
						content,
						user: {
							firstName,
							email,
						},
					};
					return Get(ctx, post);
				} else {
					throw NotFound("Post");
				}
			},
		},
		update: {
			rest: "PUT /:id",
			auth: "required",
			params: {
				content: { type: "string" },
				id: { type: "string" },
			},
			async handler(ctx) {
				const { id, content } = ctx.params;
				const { userId } = ctx.meta.user;
				const checkEntryExist = await this.adapter.findById(id);
				console.log("checkEntryExist", checkEntryExist);
				if (checkEntryExist) {
					if (checkEntryExist.dataValues.authorId === userId) {
						const updatedAt = new Date();
						const updataPost = {
							content,
							updatedAt,
						};
						const data = await this.adapter.updateById(id, {
							$set: updataPost,
						});
						return Update(ctx, data);
					} else {
						return BadRequest(ctx, "Cannot update Post");
					}
				} else {
					throw NotFound("Post");
				}
			},
		},
		delete: {
			rest: "DELETE /:id",
			auth: "required",
			params: {
				id: { type: "string" },
			},
			async handler(ctx) {
				const { id } = ctx.params;
				const { userId } = ctx.meta.user;
				const checkEntryExist = await this.adapter.findById(id);
				if (checkEntryExist) {
					if (checkEntryExist.dataValues.authorId === userId) {
						const data = await this.adapter.removeById(id);
						return Delete(ctx, data);
					} else {
						return BadRequest(ctx, "Cannot delete post");
					}
				} else {
					throw NotFound("Post");
				}
			},
		},
	},
	methods: {
		refactorPosts(data) {
			let posts = [];
			_.forEach(data, (item) => {
				const { id, title, content, firstName, email } = item;
				const newItem = {
					id,
					title,
					content,
					user: {
						firstName,
						email,
					},
				};
				posts.push(newItem);
			});
			return posts;
		},
		getSinglePost: async function (id) {
			const data = await this.adapter.db.query(
				`SELECT p.id, p.title, p.content, U.firstName, U.email
			FROM posts as P, users as U
			WHERE U.id = P.authorId AND P.id = ?`,
				{
					replacements: [Number(id)],
					type: QueryTypes.SELECT,
				}
			);
			return data;
		},
	},
};
