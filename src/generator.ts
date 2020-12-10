import * as t from '@babel/types'
import generate from '@babel/generator'
import {
  GraphQLTypeInfo,
  GUARD_PARAM_NAME,
  GRAPHQL_OBJECT_PROPERTY,
  GraphQLTypePredicateInfo,
} from './types'
import { kMaxLength } from 'buffer'

const buildGuardParam = (): t.Identifier => {
  const param = t.identifier(GUARD_PARAM_NAME)

  // Accepting params types : (gqlObject: void | object | GqlObject | null | undefined)
  param.typeAnnotation = t.tsTypeAnnotation(
    t.tsUnionType([
      t.tsVoidKeyword(),
      t.tsObjectKeyword(),
      t.tsTypeReference(t.identifier('GqlObject')),
      t.tsNullKeyword(),
      t.tsUndefinedKeyword(),
    ])
  )

  return param
}

const buildTypenameCondition = (typename: string) => {
  return t.binaryExpression(
    '===',
    t.memberExpression(t.identifier(GUARD_PARAM_NAME), t.identifier('__typename')),
    t.stringLiteral(typename)
  )
}

const buildCondition = ({
  typename,
  properties,
}: GraphQLTypePredicateInfo): t.LogicalExpression => {
  // cond: !!gqlObject
  const isDefinedExpression = t.unaryExpression(
    '!',
    t.unaryExpression('!', t.identifier(GUARD_PARAM_NAME))
  )

  // cond: '__typename' in gqlObject
  const hasTypenamePropExpression = t.binaryExpression(
    'in',
    t.stringLiteral(GRAPHQL_OBJECT_PROPERTY),
    t.identifier(GUARD_PARAM_NAME)
  )

  // cond: gqlObject.__typename === {typename}
  let typenameConditionExpression: t.BinaryExpression | t.LogicalExpression
  if (typeof typename === 'string') {
    typenameConditionExpression = buildTypenameCondition(typename)
  } else {
    typenameConditionExpression = buildTypenameCondition(typename[0])
    for (let i = 1, l = typename.length; i < l; ++i) {
      const current = buildTypenameCondition(typename[i])
      typenameConditionExpression = t.logicalExpression('||', typenameConditionExpression, current)
    }
  }

  // isDefinedExpression && hasTypenamePropExpression && typenameConditionExpression
  let logicalExpression = t.logicalExpression(
    '&&',
    t.logicalExpression('&&', isDefinedExpression, hasTypenamePropExpression),
    typenameConditionExpression
  )
  for (let i = 0, l = properties.length; i < l; ++i) {
    const property = properties[i]
    logicalExpression = t.logicalExpression(
      '&&',
      logicalExpression,
      t.binaryExpression('in', t.stringLiteral(property.name), t.identifier(GUARD_PARAM_NAME))
    )
  }

  return logicalExpression
}

const buildArrowFunction = (predicate: GraphQLTypePredicateInfo): t.ArrowFunctionExpression => {
  const { reference } = predicate
  const condition = buildCondition(predicate)

  const arrowFunctionAst = t.arrowFunctionExpression(
    [buildGuardParam()],
    t.blockStatement([t.returnStatement(condition)])
  )
  arrowFunctionAst.returnType = t.tsTypeAnnotation(
    t.tsTypePredicate(
      t.identifier(GUARD_PARAM_NAME),
      t.tsTypeAnnotation(t.tsTypeReference(t.identifier(reference)))
    )
  )

  return arrowFunctionAst
}

const buildGuardObject = (predicates: GraphQLTypePredicateInfo[]): t.ObjectExpression => {
  const props: t.ObjectProperty[] = []

  for (let i = 0, l = predicates.length; i < l; ++i) {
    const predicate = predicates[i]
    const { typename } = predicate
    const propName = typeof typename === 'string' ? typename : typename.join('Or')

    props.push(t.objectProperty(t.identifier(`is${propName}`), buildArrowFunction(predicate)))
    if (Array.isArray(typename)) {
      for (let j = 0, k = typename.length; j < k; ++j) {
        props.push(
          t.objectProperty(
            t.identifier(`is${typename[j]}`),
            buildArrowFunction({ ...predicate, typename: typename[j] })
          )
        )
      }
    }
  }

  return t.objectExpression(props)
}

const buildNamedExport = (graphqlTypeInfo: GraphQLTypeInfo): t.ExportNamedDeclaration => {
  const { name, predicates } = graphqlTypeInfo
  const splittedName = name.split('_')

  if (splittedName.length === 1) {
    const predicate = graphqlTypeInfo.predicates[0]
    if (graphqlTypeInfo.predicates.length > 1) {
      throw new Error('')
    }
    const propName =
      typeof predicate.typename === 'string' ? predicate.typename : predicate.typename.join('Or')
    const idName = `is${propName}Fragment`
    return t.exportNamedDeclaration(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(idName), buildArrowFunction(predicate)),
      ])
    )
  } else {
    const idName = splittedName
      .slice(1)
      .map(segment => `${segment.charAt(0).toUpperCase()}${segment.substr(1)}`)
      .join('')

    return t.exportNamedDeclaration(
      t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier(idName), buildGuardObject(predicates)),
      ])
    )
  }
}

const buildImportDeclaration = (filename: string, graphqlTypeInfos: GraphQLTypeInfo[]) => {
  const names: string[] = []
  for (let i = 0, l = graphqlTypeInfos.length; i < l; ++i) {
    const graphqlTypeInfo = graphqlTypeInfos[i]
    for (let j = 0, k = graphqlTypeInfo.predicates.length; j < k; ++j) {
      const predicate = graphqlTypeInfo.predicates[j]
      names.push(predicate.reference)
    }
  }

  return t.importDeclaration(
    names.map(name => t.importSpecifier(t.identifier(name), t.identifier(name))),
    t.stringLiteral(`../${filename}`)
  )
}

const buildGqlObjectInterface = () => {
  return t.tsInterfaceDeclaration(
    t.identifier('GqlObject'),
    t.tsTypeParameterDeclaration([
      t.tsTypeParameter(t.tsStringKeyword(), t.tsStringKeyword(), 'T'),
    ]),
    null,
    t.tsInterfaceBody([
      t.tsPropertySignature(
        t.identifier('__typename'),
        t.tsTypeAnnotation(t.tsTypeReference(t.identifier('T')))
      ),
    ])
  )
}

export const generateGuards = (filename: string, graphQLTypes: GraphQLTypeInfo[]): string => {
  const guardsAst: t.Statement[] = graphQLTypes.map(buildNamedExport)
  const importDeclaration = buildImportDeclaration(filename, graphQLTypes)
  const gqlInterface = buildGqlObjectInterface()

  guardsAst.unshift(importDeclaration, gqlInterface)

  const { code } = generate(t.program(guardsAst))

  return code
}
