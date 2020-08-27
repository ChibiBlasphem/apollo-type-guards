import { parse } from '@babel/parser'
import * as types from '@babel/types'
import { GraphQLTypeInfo, GRAPHQL_OBJECT_PROPERTY } from './types'

type TSTypeDeclaration = types.TSInterfaceDeclaration | types.TSTypeAliasDeclaration

export const extractGraphQLTypes = (code: string): GraphQLTypeInfo[] => {
  const { program } = parse(code, {
    plugins: ['typescript'],
    sourceType: 'module',
  })

  const namedExports = extractNamedExports(program.body)
  const typeDeclarations = extractDeclarations(namedExports)

  return typeDeclarations.filter(hasTypenameProperty).map(transformToGraphQLTypeInfo)
}

const extractNamedExports = (statements: types.Statement[]): types.ExportNamedDeclaration[] => {
  const namedExports = []
  for (let i = 0, l = statements.length; i < l; ++i) {
    const statement = statements[i]
    if (types.isExportNamedDeclaration(statement)) {
      namedExports.push(statement)
    }
  }
  return namedExports
}

const extractDeclarations = (namedExports: types.ExportNamedDeclaration[]): TSTypeDeclaration[] => {
  const typesDeclarations = []
  for (let i = 0, l = namedExports.length; i < l; ++i) {
    const declaration = namedExports[i].declaration
    if (
      (types.isTSTypeAliasDeclaration(declaration) &&
        types.isTSTypeLiteral(declaration.typeAnnotation)) ||
      types.isTSInterfaceDeclaration(declaration)
    ) {
      typesDeclarations.push(declaration)
    }
  }
  return typesDeclarations
}

const hasTypenameProperty = (type: TSTypeDeclaration): boolean => {
  if (types.isTSInterfaceDeclaration(type)) {
    return !!type.body.body.find(isTypenameProperty)
  } else {
    return !!(type.typeAnnotation as types.TSTypeLiteral).members.find(isTypenameProperty)
  }
}

const isTypenameProperty = (
  property: types.TSTypeElement
): property is types.TSPropertySignature => {
  return (
    types.isTSPropertySignature(property) &&
    types.isIdentifier(property.key) &&
    property.key.name === GRAPHQL_OBJECT_PROPERTY &&
    types.isTSTypeAnnotation(property.typeAnnotation) &&
    types.isTSLiteralType(property.typeAnnotation.typeAnnotation) &&
    types.isStringLiteral(property.typeAnnotation.typeAnnotation.literal)
  )
}

const extractTypenameValue = (
  typeAnnotation: types.TSTypeAnnotation | null
): string | undefined => {
  if (
    typeAnnotation &&
    types.isTSTypeAnnotation(typeAnnotation) &&
    types.isTSLiteralType(typeAnnotation.typeAnnotation) &&
    types.isStringLiteral(typeAnnotation.typeAnnotation.literal)
  ) {
    return typeAnnotation.typeAnnotation.literal.value
  }
}

const extractTypename = (type: TSTypeDeclaration): string => {
  let typenameProperty: types.TSPropertySignature | undefined
  if (types.isTSInterfaceDeclaration(type)) {
    typenameProperty = type.body.body.find(isTypenameProperty)
  } else {
    typenameProperty = (type.typeAnnotation as types.TSTypeLiteral).members.find(isTypenameProperty)
  }

  let typename: string | undefined
  if (!typenameProperty || !(typename = extractTypenameValue(typenameProperty.typeAnnotation))) {
    throw new Error(
      `Type ${type.id.name} should have a property ${GRAPHQL_OBJECT_PROPERTY} which has a const string value`
    )
  }

  return typename
}

const transformToGraphQLTypeInfo = (type: TSTypeDeclaration): GraphQLTypeInfo => {
  return { name: type.id.name, typename: extractTypename(type) }
}
