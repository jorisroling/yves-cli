export default class CustomError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'CustomError';
  }
}
