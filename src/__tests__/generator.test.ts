import * as t from '@babel/types'
import { generateGuards } from '../generator'

const userFixture = loadFixture('generator/CurrentUserQuery')
const postFixture = loadFixture('generator/PostQuery')
const unionedFixture = loadFixture('generator/UnionedQuery')
const fragmentFixture = loadFixture('generator/Fragment')

const framgentType = [
  {
    name: 'UserFragment_address',
    typename: 'Address',
    properties: [
      { name: 'id', type: t.tsStringKeyword() },
      { name: 'streetNumber', type: t.tsNumberKeyword() },
      { name: 'streetName', type: t.tsStringKeyword() },
    ],
  },
  {
    name: 'UserFragment',
    typename: 'User',
    properties: [
      { name: 'id', type: t.tsStringKeyword() },
      { name: 'firstname', type: t.tsStringKeyword() },
      { name: 'lastname', type: t.tsStringKeyword() },
      { name: 'address', type: t.tsTypeReference(t.identifier('UserFragment_address')) },
    ],
  },
]

const oneType = [
  {
    name: 'CurrentUserQuery_currentUser',
    typename: 'User',
    properties: [
      { name: 'id', type: t.tsStringKeyword() },
      { name: 'firstname', type: t.tsStringKeyword() },
      { name: 'lastname', type: t.tsStringKeyword() },
    ],
  },
]

const manyTypes = [
  {
    name: 'PostQuery_post_comments',
    typename: 'Comment',
    properties: [
      { name: 'id', type: t.tsStringKeyword() },
      { name: 'content', type: t.tsStringKeyword() },
    ],
  },
  {
    name: 'PostQuery_post',
    typename: 'Post',
    properties: [
      { name: 'id', type: t.tsStringKeyword() },
      { name: 'title', type: t.tsStringKeyword() },
      { name: 'content', type: t.tsStringKeyword() },
      {
        name: 'comments',
        type: t.tsArrayType(t.tsTypeReference(t.identifier('PostQuery_post_comments'))),
      },
    ],
  },
]

const unionedTypes = [
  {
    name: 'SearchQuery_search',
    typename: ['User', 'Repository'],
    properties: [
      { name: 'id', type: t.tsStringKeyword() },
      { name: 'name', type: t.tsStringKeyword() },
    ],
  },
]

describe('generateGuards', () => {
  it('Should generate guard objects for a graphQL type info', () => {
    expect(generateGuards('CurrentUserQuery.ts', oneType)).toBe(userFixture)
  })

  it('Should generate guard objects when there is multiple graphql types', () => {
    expect(generateGuards('PostQuery.ts', manyTypes)).toBe(postFixture)
  })

  it('Should generate guard object for union graphql type info', () => {
    expect(generateGuards('SearchQuery.ts', unionedTypes)).toBe(unionedFixture)
  })

  it('Should generate standalone guard for fragments', () => {
    expect(generateGuards('UserFragment.ts', framgentType)).toBe(fragmentFixture)
  })
})
