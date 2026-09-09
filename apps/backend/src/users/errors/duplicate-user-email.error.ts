export class DuplicateUserEmailError extends Error {
  constructor() {
    super('User email already exists');
    this.name = 'DuplicateUserEmailError';
  }
}
