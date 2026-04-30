const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (req.originalUrl.startsWith('/admin')) {
    return res.status(statusCode).render('admin/error', {
      layout: false,
      error: message,
      statusCode
    });
  }

  res.status(statusCode).render('pages/error', {
    error: message,
    statusCode,
    pageTitle: 'Error'
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).render('pages/404', {
    pageTitle: 'Page Not Found'
  });
};

module.exports = { errorHandler, notFoundHandler };
