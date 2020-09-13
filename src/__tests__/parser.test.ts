import { extractGraphQLTypes } from '../parser'
import * as t from '@babel/types'

const userFixture = loadFixture('parser/CurrentUserQuery')
const postFixture = loadFixture('parser/PostQuery')
const unionedFixture = loadFixture('parser/UnionedQuery')
const quizzFixture = loadFixture('parser/QuizzQuery')
const unionTypesFixture = loadFixture('parser/UnionTypesQuery')

const ref = (identifierName: string): t.TSTypeReference => {
  const { typeParameters: _, ...typeRef } = t.tsTypeReference(t.identifier(identifierName))
  return typeRef as t.TSTypeReference
}

describe('extractGraphQLTypes', () => {
  it('Should return an array of the interfaces containing a property "__typename"', () => {
    expect(extractGraphQLTypes(userFixture)).toMatchObject([
      {
        name: 'CurrentUserQuery_currentUser',
        predicates: [
          {
            reference: 'CurrentUserQuery_currentUser',
            typename: 'User',
            properties: [
              { name: 'id', type: t.tsStringKeyword() },
              { name: 'firstname', type: t.tsStringKeyword() },
              { name: 'lastname', type: t.tsStringKeyword() },
            ],
          },
        ],
      },
    ])
  })
  it('Should return an array of the types containing a property "__typename"', () => {
    const typeRef = ref('PostQuery_post_comments')

    expect(extractGraphQLTypes(postFixture)).toMatchObject([
      {
        name: 'PostQuery_post_comments',
        predicates: [
          {
            reference: 'PostQuery_post_comments',
            typename: 'Comment',
            properties: [
              { name: 'id', type: t.tsStringKeyword() },
              { name: 'content', type: t.tsStringKeyword() },
            ],
          },
        ],
      },
      {
        name: 'PostQuery_post',
        predicates: [
          {
            reference: 'PostQuery_post',
            typename: 'Post',
            properties: [
              { name: 'id', type: t.tsStringKeyword() },
              { name: 'title', type: t.tsStringKeyword() },
              { name: 'content', type: t.tsStringKeyword() },
              {
                name: 'comments',
                type: t.tsArrayType(typeRef as t.TSTypeReference),
              },
            ],
          },
        ],
      },
    ])
  })
  it('Should return an array of the types containing a property "__typename"', () => {
    const correctionsTypeRef = ref('QuizzQuery_questions_corrections')
    const statementsTypeRef = ref('QuizzQuery_questions_statements')

    expect(extractGraphQLTypes(quizzFixture)).toMatchObject([
      {
        name: 'QuizzQuery_questions_corrections',
        predicates: [
          {
            reference: 'QuizzQuery_questions_corrections',
            typename: 'Media',
            properties: [{ name: 'filename', type: t.tsStringKeyword() }],
          },
        ],
      },
      {
        name: 'QuizzQuery_questions_statements',
        predicates: [
          {
            reference: 'QuizzQuery_questions_statements',
            typename: 'Media',
            properties: [{ name: 'filename', type: t.tsStringKeyword() }],
          },
        ],
      },
      {
        name: 'QuizzQuery_questions',
        predicates: [
          {
            reference: 'QuizzQuery_questions',
            typename: 'Question',
            properties: [
              { name: 'corrections', type: t.tsArrayType(correctionsTypeRef as t.TSTypeReference) },
              { name: 'statements', type: t.tsArrayType(statementsTypeRef as t.TSTypeReference) },
            ],
          },
        ],
      },
    ])
  })
  it('Should return multiple items if "__typename" is an String Union', () => {
    expect(extractGraphQLTypes(unionedFixture)).toMatchObject([
      {
        name: 'UnionedQuery_search',
        predicates: [
          {
            reference: 'UnionedQuery_search',
            typename: ['User', 'Repository'],
            properties: [
              { name: 'id', type: t.tsStringKeyword() },
              { name: 'name', type: t.tsStringKeyword() },
            ],
          },
        ],
      },
    ])
  })
  it('Should return mutiple predicates for a union types', () => {
    expect(extractGraphQLTypes(unionTypesFixture)).toMatchObject([
      {
        name: 'UnionTypesQuery_currentUser',
        predicates: [
          {
            reference: 'UnionTypesQuery_currentUser_User',
            typename: 'User',
            properties: [
              { name: 'id', type: t.tsStringKeyword() },
              { name: 'displayName', type: t.tsStringKeyword() },
              { name: 'photoURL', type: t.tsUnionType([t.tsStringKeyword(), t.tsNullKeyword()]) },
            ],
          },
          {
            reference: 'UnionTypesQuery_currentUser_AuthUser',
            typename: 'AuthUser',
            properties: [
              { name: 'id', type: t.tsStringKeyword() },
              {
                name: 'defaultDisplayName',
                type: t.tsUnionType([t.tsStringKeyword(), t.tsNullKeyword()]),
              },
              {
                name: 'defaultPhotoURL',
                type: t.tsUnionType([t.tsStringKeyword(), t.tsNullKeyword()]),
              },
            ],
          },
        ],
      },
    ])
  })
})
