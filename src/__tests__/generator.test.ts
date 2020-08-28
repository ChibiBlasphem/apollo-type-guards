import { generateGuards } from '../generator'

const userFixture = loadFixture('generator/CurrentUserQuery')
const postFixture = loadFixture('generator/PostQuery')

const oneType = [{ name: 'CurrentUserQuery_currentUser', typename: 'User' }]

const manyTypes = [
  { name: 'PostQuery_post_comments', typename: 'Comment' },
  { name: 'PostQuery_post', typename: 'Post' },
]

describe('generateGuards', () => {
  it('Should generate guard for each graphQL type info', () => {
    expect(generateGuards('CurrentUserQuery.ts', oneType)).toBe(userFixture)
    expect(generateGuards('PostQuery.ts', manyTypes)).toBe(postFixture)
  })
})
