import * as types from '@babel/types'
import { parse, parseExpression } from '@babel/parser'
import generate from '@babel/generator'
import { GraphQLTypeInfo } from './types'

const PARAM_NAME = 'gqlObject'

export const generateGuards = (graphQLTypes: GraphQLTypeInfo[]) => {
  const typeParametersAst = types.tsTypeParameterDeclaration([
    types.tsTypeParameter(types.tsStringKeyword(), types.tsStringKeyword(), 'T'),
  ])
  const interfaceBodyAst = types.tsInterfaceBody([
    types.tsPropertySignature(
      types.identifier('__typename'),
      types.tsTypeAnnotation(types.tsTypeReference(types.identifier('T')))
    ),
  ])
  const interfaceAst = types.tsInterfaceDeclaration(
    types.identifier('GqlObject'),
    typeParametersAst,
    null,
    interfaceBodyAst
  )

  const guardsAst: types.Statement[] = graphQLTypes.map(typeToGuardAst)
  guardsAst.unshift(interfaceAst)

  const { code } = generate(types.program(guardsAst))

  return code
}

const typeToGuardAst = ({ name, typename }: GraphQLTypeInfo): types.ExportNamedDeclaration => {
  const objParamAst = types.identifier(PARAM_NAME)
  objParamAst.typeAnnotation = types.tsTypeAnnotation(
    types.tsTypeReference(types.identifier('GqlObject'))
  )

  const binaryExpressionAst = types.binaryExpression(
    '===',
    types.memberExpression(types.identifier(PARAM_NAME), types.identifier('__typename')),
    types.stringLiteral(typename)
  )

  const arrowFunctionAst = types.arrowFunctionExpression([objParamAst], binaryExpressionAst)
  arrowFunctionAst.returnType = types.tsTypeAnnotation(
    types.tsTypePredicate(
      types.identifier(PARAM_NAME),
      types.tsTypeAnnotation(types.tsTypeReference(types.identifier(name)))
    )
  )

  return types.exportNamedDeclaration(
    types.variableDeclaration('const', [
      types.variableDeclarator(types.identifier(`is${typename}`), arrowFunctionAst),
    ])
  )
}
