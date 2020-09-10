import * as t from '@babel/types'

export type TypeProperties = { name: string; type: t.TSType }

export type GraphQLTypeInfo = {
  name: string
  typename: string | string[]
  properties: TypeProperties[]
}

export const GUARD_PARAM_NAME = 'gqlObject'
export const GRAPHQL_OBJECT_PROPERTY = '__typename'
