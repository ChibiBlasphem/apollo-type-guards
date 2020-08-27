import { readFileSync } from 'fs'
import { extractGraphQLTypes } from '../parser'

const userFixture = loadFixture('parser/CurrentUserQuery')
const postFixture = loadFixture('parser/PostQuery')

describe('extractGraphQLTypes', () => {
  it('Should return an array of the types containing a property "__typename"', () => {
    expect(extractGraphQLTypes(userFixture)).toEqual([
      { name: 'CurrentUserQuery_currentUser', typename: 'User' },
    ])
    expect(extractGraphQLTypes(postFixture)).toEqual([
      { name: 'PostQuery_post_comments', typename: 'Comment' },
      { name: 'PostQuery_post', typename: 'Post' },
    ])
  })
})
