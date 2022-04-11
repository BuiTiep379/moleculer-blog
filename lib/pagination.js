const getPagingData = (data, page, limit) => {
	const offset = (page - 1) * limit; // 0
	const currentPage = page;
	const totalItems = limit;
	const totalPages = Math.ceil(data.length / limit);
	const items = data.slice(offset, page * limit);
	return { items, totalItems, totalPages, currentPage };
};
module.exports = getPagingData;
