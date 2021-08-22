const assert = require('assert');

const Github = require('../src/github');

describe('Github.checkPermissions(authScopes, clientScopes)', () => {
  it('should return true if authScopes and clientScopes contain the same scopes in the SAME order', () => {
    const authScopes = ['delete_repo', 'repo'];
    const clientScopes = ['delete_repo', 'repo'];

    assert.equal(true, Github.checkPermissions(authScopes, clientScopes));
  });

  it('should return true if authScopes and clientScopes contain the same scopes in a DIFFERENT order', () => {
    const authScopes = ['delete_repo', 'repo'];
    const clientScopes = ['repo', 'delete_repo'];

    assert.equal(true, Github.checkPermissions(authScopes, clientScopes));
  });

  it('should return true if authScopes has MORE scopes than clientScopes but contains the subset from clientScopes in a DIFFERENT order', () => {
    const authScopes = ['delete_repo', 'repo', 'gist'];
    const clientScopes = ['repo', 'delete_repo'];

    assert.equal(true, Github.checkPermissions(authScopes, clientScopes));
  });

  it('should return true if authScopes has MORE scopes than clientScopes but contains the subset from clientScopes in the SAME order', () => {
    const authScopes = ['delete_repo', 'repo', 'gist'];
    const clientScopes = ['delete_repo', 'repo'];

    assert.equal(true, Github.checkPermissions(authScopes, clientScopes));
  });

  it('should return false if authScopes has FEWER scopes than clientScopes', () => {
    const authScopes = ['delete_repo', 'repo'];
    const clientScopes = ['repo', 'delete_repo', 'gist'];

    assert.equal(false, Github.checkPermissions(authScopes, clientScopes));
  });

  it('should return false if authScopes and clientScopes have the SAME AMOUNT but DIFFERENT scopes', () => {
    const authScopes = ['delete_repo', 'repo', 'gist'];
    const clientScopes = ['repo', 'delete_repo', 'user'];

    assert.equal(false, Github.checkPermissions(authScopes, clientScopes));
  });
});
