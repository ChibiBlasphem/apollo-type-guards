import * as types from '@babel/types'
import { GraphQLTypeInfo } from './types'
import { parse, parseExpression } from '@babel/parser'

export const generateGuards = (graphQLTypes: GraphQLTypeInfo[]) => {
  const guardsAst = graphQLTypes.map(typeToGuardAst)
}

const typeToGuardAst = ({ name, typename }: GraphQLTypeInfo): types.ExportNamedDeclaration => {
  console.log(
    parseExpression('<T extends GqlObject>(obj: T): obj is A => {}', {
      plugins: ['typescript'],
    })
  )

  // return types.exportNamedDeclaration(
  //   types.variableDeclaration('const', [
  //     types.variableDeclarator(types.identifier(`is${typename}`), types.arrowFunctionExpression(

  //     )),
  //   ])
  // )
}
