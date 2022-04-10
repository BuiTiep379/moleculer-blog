"use strict";

const ApiGateway = require("moleculer-web");
const { Unauthenticated, Unauthorized } = require("../lib/response");
const Redis = require("ioredis");
const redis = new Redis();
const _ = require("lodash");
const jwt = require("jsonwebtoken");

/**
 * @typedef {import('moleculer').Context} Context Moleculer's Context
 * @typedef {import('http').IncomingMessage} IncomingRequest Incoming HTTP Request
 * @typedef {import('http').ServerResponse} ServerResponse HTTP Server Response
 */

module.exports = {
	name: "api",
	mixins: [ApiGateway],

	// More info about settings: https://moleculer.services/docs/0.14/moleculer-web.html
	settings: {
		// Exposed port
		port: process.env.PORT || 3000,

		// Exposed IP
		ip: "0.0.0.0",

		// Global Express middlewares. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Middlewares
		use: [],

		routes: [
			{
				name: "categories",
				path: "/api/categories/",
				authentication: true,
				authorization: true,
				aliases: {
					"GET /": "categories.list",
					"POST /": "categories.create",
					"GET /:id": "categories.get",
					"PUT /:id": "categories.update",
					"DELETE /:id": "categories.delete",
				},
			},
			{
				name: "posts",
				path: "/api/posts/",
				authentication: true,
				authorization: true,
				aliases: {
					"GET /": "posts.list",
					"POST /": "posts.create",
					"GET /:id": "posts.get",
					"PUT /:id": "posts.update",
					"DELETE /:id": "posts.delete",
				},
			},
			{
				path: "/api/users",
				aliases: {
					"POST signin": "users.signin",
					"POST signup": "users.signup",
				},
			},
		],
		mergeParams: true,
		// Mapping policy setting. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Mapping-policy
		mappingPolicy: "all", // Available values: "all", "restrict"
		bodyParsers: {
			json: {
				strict: false,
				// limit: "1MB",
			},
			urlencoded: {
				extended: true,
				// limit: "1MB",
			},
		},
		// Enable/disable logging
		logging: true,
		// Do not log client side errors (does not log an error response when the error.code is 400<=X<500)
		log4XXResponses: false,
		// Logging the request parameters. Set to any log level to enable it. E.g. "info"
		logRequestParams: null,
		// Logging the response data. Set to any log level to enable it. E.g. "info"
		logResponseData: null,

		// Serve assets from "public" folder. More info: https://moleculer.services/docs/0.14/moleculer-web.html#Serve-static-files
		assets: {
			folder: "public",

			// Options to `server-static` module
			options: {},
		},

		onError(req, res, err) {
			// Return with the error as JSON object
			res.setHeader("Content-type", "application/json; charset=utf-8");
			res.writeHead(err.code || 500);
			let errorObject = {};
			if (err.code == 422) {
				err.data.forEach((e) => {
					let field = e.field;
					errorObject[field] = e.message;
				});

				res.end(JSON.stringify({ errors: errorObject }));
			} else if (err.name == "TokenExpiredError") {
				errorObject = _.pick(err, ["message"]);
				errorObject.type = "JWT_EXPIRED_ERROR";
				res.end(JSON.stringify({ errors: errorObject }));
			} else {
				// pick chỉ lấy field chỉ định
				errorObject = _.pick(err, ["message", "type"]);
				res.end(JSON.stringify({ errors: errorObject }));
			}
			this.logResponse(req, res, err ? err.ctx : null);
		},
	},

	methods: {
		/**
		 * Authenticate the request. It check the `Authorization` token value in the request header.
		 * Check the token value & resolve the user by the token.
		 * The resolved user will be available in `ctx.meta.user`
		 *
		 * PLEASE NOTE, IT'S JUST AN EXAMPLE IMPLEMENTATION. DO NOT USE IN PRODUCTION!
		 *
		 * @param {Context} ctx
		 * @param {Object} route
		 * @param {IncomingRequest} req
		 * @returns {Promise}
		 */
		async authenticate(ctx, route, req) {
			// Read the token from header
			const auth = req.headers["authorization"];
			// console.log("auth", auth);
			if (auth && auth.startsWith("Bearer")) {
				const token = auth.split(" ")[1];
				// Check the token. Tip: call a service which verify the token. E.g. `accounts.resolveToken`
				// Or use Promise
				if (token) {
					// Returns the resolved user. It will be set to the `ctx.meta.user`
					const res = jwt.verify(token, process.env.JWT_SECRET);
					// const res = await ctx.call("users.resolveToken", { token });
					const redisToken = await redis.get(res.data.userId);
					// console.log("redisToken: ", redisToken);
					if (!redisToken) {
						// Invalid token
						throw Unauthenticated();
					}
					ctx.meta.user = res.data;
					ctx.meta.token = token;
					return res.data;
				} else {
					// Invalid token
					throw Unauthenticated();
				}
			} else {
				// No token. Throw an error or do nothing if anonymous access is allowed.
				// throw new E.UnAuthorizedError(E.ERR_NO_TOKEN);
				throw Unauthenticated();
			}
		},

		/**
		 * Authorize the request. Check that the authenticated user has right to access the resource.
		 *
		 * PLEASE NOTE, IT'S JUST AN EXAMPLE IMPLEMENTATION. DO NOT USE IN PRODUCTION!
		 *
		 * @param {Context} ctx
		 * @param {Object} route
		 * @param {IncomingRequest} req
		 * @returns {Promise}
		 */
		async authorize(ctx, route, req) {
			// Get the authenticated user.
			// const res = await this.authenticate(ctx, route, req);
			const {
				method,
				route: { name },
			} = req.$alias;
			const { userId, permissions, role } = ctx.meta.user;
			console.log("method, name ", method, name);
			if (role == "Admin") {
				return;
			}
			if (
				req.$action.auth === "required" &&
				!userId &&
				Object.keys(permissions).length == 0
			) {
				throw Unauthorized();
			}
			let check = false;
			_.forIn(permissions, (value, key) => {
				if (key === name) {
					_.map(value, (data, index) => {
						if (data === method) {
							check = true;
						}
					});
				}
			});
			if (check) {
				return;
			} else {
				throw Unauthorized();
			}
		},
	},
};
