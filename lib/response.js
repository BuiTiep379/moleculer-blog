const { StatusCodes } = require("http-status-codes");
const { MoleculerError } = require("moleculer").Errors;
const message = {
	GET: "Get completed",
	CREATE: "Create completed",
	UPDATE: "Update completed",
	DELETE: "Delete completed",
	UNAUTHENTICATE: "Signin is required",
	UNAUTHORIZE: "Not allowed to access",
	SERVER_ERROR: "Server error",
	BAD_REQUEST: "BadRequest error",
	JWT_EXPIRED: "Expired token",
};
const TYPE_ERROR = {
	SERVER_ERROR: "SERVER_ERROR",
	AUTHENTICATION_ERROR: "AUTHENTICATION_ERROR",
	AUTHORIZATION_ERROR: "AUTHORIZATION_ERROR",
	NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
	BAD_REQUEST_ERROR: "BAD_REQUEST_ERROR",
	JWT_EXPIRED_ERROR: "JWT_EXPIRED_ERROR",
};
const Response = (ctx, data, httpStatus = StatusCodes.OK) => {
	ctx.meta.$statusCode = httpStatus;
	return data;
};

const Get = (ctx, data) => {
	return Response(ctx, { message: message.GET, data }, StatusCodes.OK);
};
const Create = (ctx, msg, data) => {
	return Response(
		ctx,
		{ message: `${msg === null ? message.CREATE : msg}`, data },
		StatusCodes.CREATED
	);
};
const Update = (ctx, data) => {
	return Response(ctx, {
		message: message.UPDATE,
		data,
	});
};

const Delete = (ctx, data) => {
	return Response(ctx, {
		message: message.DELETE,
		data,
	});
};
const ServerError = () => {
	return new MoleculerError(
		message.SERVER_ERROR,
		StatusCodes.INTERNAL_SERVER_ERROR,
		TYPE_ERROR.SERVER_ERROR
	);
};
// yeu cau signin
const Unauthenticated = () => {
	return new MoleculerError(
		message.UNAUTHENTICATE,
		StatusCodes.UNAUTHORIZED,
		TYPE_ERROR.AUTHENTICATION_ERROR
	);
};
// ko cho phep
const Unauthorized = () => {
	return new MoleculerError(
		message.UNAUTHORIZE,
		StatusCodes.FORBIDDEN,
		TYPE_ERROR.AUTHORIZATION_ERROR
	);
};

const BadRequest = (ctx, message) => {
	return new MoleculerError(
		message.BAD_REQUEST,
		StatusCodes.BAD_REQUEST,
		TYPE_ERROR.BAD_REQUEST_ERROR
	);
};
const JWTExpiredError = () => {
	return new MoleculerError(
		message.JWT_EXPIRED,
		StatusCodes.INTERNAL_SERVER_ERROR,
		TYPE_ERROR.JWT_EXPIRED_ERROR
	);
};
const NotFound = (input) => {
	return new MoleculerError(
		`${input} not found`,
		StatusCodes.NOT_FOUND,
		TYPE_ERROR.NOT_FOUND_ERROR
	);
};
const InputError = (ctx, message) => {
	return Response(ctx, message, StatusCodes.UNPROCESSABLE_ENTITY);
};
module.exports = {
	Response,
	Get,
	Create,
	Update,
	Delete,
	BadRequest,
	Unauthenticated,
	Unauthorized,
	NotFound,
	ServerError,
	InputError,
	JWTExpiredError,
};
