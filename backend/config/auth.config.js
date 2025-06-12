module.exports = {
  secret: process.env.JWT_SECRET || "your_jwt_secret_key_here",
  jwtExpiration: parseInt(process.env.JWT_EXPIRATION || "7200"), // Преобразовать в число
}; 