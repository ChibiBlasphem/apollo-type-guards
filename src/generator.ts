import * as types from '@babel/types'
import generate from '@babel/generator'
import { GraphQLTypeInfo, GUARD_PARAM_NAME, GRAPHQL_OBJECT_PROPERTY } from './types'

const buildGuardParam = (): types.Identifier => {
  const param = types.identifier(GUARD_PARAM_NAME)

  param.typeAnnotation = types.tsTypeAnnotation(
    types.tsUnionType([
      types.tsObjectKeyword(),
      types.tsTypeReference(types.identifier('GqlObject')),
      types.tsNullKeyword(),
      types.tsUndefinedKeyword(),
    ])
  )

  return param
}

const buildCondition = ({ typename }: GraphQLTypeInfo): types.LogicalExpression => {
  const isDefinedExpression = types.unaryExpression(
    '!',
    types.unaryExpression('!', types.identifier(GUARD_PARAM_NAME))
  )
  const hasTypenamePropExpression = types.binaryExpression(
    'in',
    types.stringLiteral(GRAPHQL_OBJECT_PROPERTY),
    types.identifier(GUARD_PARAM_NAME)
  )
  const typenameEqualsString = types.binaryExpression(
    '===',
    types.memberExpression(types.identifier(GUARD_PARAM_NAME), types.identifier('__typename')),
    types.stringLiteral(typename)
  )

  return types.logicalExpression(
    '&&',
    types.logicalExpression('&&', isDefinedExpression, hasTypenamePropExpression),
    typenameEqualsString
  )
}

const buildArrowFunction = ({ name, typename }: GraphQLTypeInfo): types.ArrowFunctionExpression => {
  const condition = buildCondition({ name, typename })

  const arrowFunctionAst = types.arrowFunctionExpression(
    [buildGuardParam()],
    types.blockStatement([types.returnStatement(condition)])
  )
  arrowFunctionAst.returnType = types.tsTypeAnnotation(
    types.tsTypePredicate(
      types.identifier(GUARD_PARAM_NAME),
      types.tsTypeAnnotation(types.tsTypeReference(types.identifier(name)))
    )
  )

  return arrowFunctionAst
}

const buildNamedExport = ({ name, typename }: GraphQLTypeInfo): types.ExportNamedDeclaration => {
  return types.exportNamedDeclaration(
    types.variableDeclaration('const', [
      types.variableDeclarator(
        types.identifier(`is${typename}`),
        buildArrowFunction({ name, typename })
      ),
    ])
  )
}

const buildImportDeclaration = (filename: string, names: string[]) => {
  return types.importDeclaration(
    names.map(name => types.importSpecifier(types.identifier(name), types.identifier(name))),
    types.stringLiteral(`../${filename}`)
  )
}

const buildGqlObjectInterface = () => {
  return types.tsInterfaceDeclaration(
    types.identifier('GqlObject'),
    types.tsTypeParameterDeclaration([
      types.tsTypeParameter(types.tsStringKeyword(), types.tsStringKeyword(), 'T'),
    ]),
    null,
    types.tsInterfaceBody([
      types.tsPropertySignature(
        types.identifier('__typename'),
        types.tsTypeAnnotation(types.tsTypeReference(types.identifier('T')))
      ),
    ])
  )
}

export const generateGuards = (filename: string, graphQLTypes: GraphQLTypeInfo[]): string => {
  const guardsAst: types.Statement[] = graphQLTypes.map(buildNamedExport)
  const importDeclaration = buildImportDeclaration(
    filename,
    graphQLTypes.map(g => g.name)
  )
  const gqlInterface = buildGqlObjectInterface()

  guardsAst.unshift(importDeclaration, gqlInterface)

  const { code } = generate(types.program(guardsAst))

  return code
}
