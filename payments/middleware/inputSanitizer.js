const { sanitizeRequestBody } = require('../../lib/security/inputGuard');
const { ValidationError } = require('../../lib/errors');

function inputSanitizer(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    try {
      sanitizeRequestBody(req.body);
    } catch (err) {
      return next(err instanceof ValidationError ? err : new ValidationError('Invalid payload'));
    }
  }
  if (req.query && typeof req.query === 'object') {
    for (const v of Object.values(req.query)) {
      if (typeof v === 'string') {
        try {
          sanitizeRequestBody({ q: v });
        } catch (err) {
          return next(new ValidationError('Invalid query'));
        }
      }
    }
  }
  next();
}

module.exports = inputSanitizer;
