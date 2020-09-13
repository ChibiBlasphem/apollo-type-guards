import * as t from '@babel/types'

export type TypeProperties = { name: string; type: t.TSType }

export type GraphQLTypePredicateInfo = {
  reference: string
  typename: string | string[]
  properties: TypeProperties[]
}

export type GraphQLTypeInfo = {
  name: string
  predicates: GraphQLTypePredicateInfo[]
}

export const GUARD_PARAM_NAME = 'gqlObject'
export const GRAPHQL_OBJECT_PROPERTY = '__typename'
