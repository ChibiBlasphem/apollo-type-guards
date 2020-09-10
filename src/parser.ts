import { parse } from '@babel/parser'
import * as types from '@babel/types'
import { GraphQLTypeInfo, GRAPHQL_OBJECT_PROPERTY } from './types'
import { TypeProperties } from './types'

type TSTypeDeclaration = types.TSInterfaceDeclaration | types.TSTypeAliasDeclaration

export const extractGraphQLTypes = (code: string): GraphQLTypeInfo[] => {
  const { program } = parse(code, {
    plugins: ['typescript'],
    sourceType: 'module',
  })

  const namedExports = extractNamedExports(program.body)
  const typeDeclarations = extractDeclarations(namedExports)

  const graphqlTypeInfos: GraphQLTypeInfo[] = []
  const validDeclarations = typeDeclarations.filter(hasTypenameProperty)

  for (let i = 0, l = validDeclarations.length; i < l; ++i) {
    graphqlTypeInfos.push(transformToGraphQLTypeInfo(validDeclarations[i]))
  }

  return graphqlTypeInfos
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
  if (
    types.isTSPropertySignature(property) &&
    types.isIdentifier(property.key) &&
    property.key.name === GRAPHQL_OBJECT_PROPERTY &&
    types.isTSTypeAnnotation(property.typeAnnotation)
  ) {
    return (
      (types.isTSLiteralType(property.typeAnnotation.typeAnnotation) &&
        types.isStringLiteral(property.typeAnnotation.typeAnnotation.literal)) ||
      (types.isTSUnionType(property.typeAnnotation.typeAnnotation) &&
        property.typeAnnotation.typeAnnotation.types.every(
          type => types.isTSLiteralType(type) && types.isStringLiteral(type.literal)
        ))
    )
  }

  return false
}

const extractTypenameValue = (
  typeAnnotation: types.TSTypeAnnotation | null
): string | string[] | undefined => {
  if (
    typeAnnotation &&
    types.isTSTypeAnnotation(typeAnnotation) &&
    types.isTSLiteralType(typeAnnotation.typeAnnotation) &&
    types.isStringLiteral(typeAnnotation.typeAnnotation.literal)
  ) {
    return typeAnnotation.typeAnnotation.literal.value
  }

  if (
    typeAnnotation &&
    types.isTSTypeAnnotation(typeAnnotation) &&
    types.isTSUnionType(typeAnnotation.typeAnnotation)
  ) {
    const values: string[] = [],
      unionType = typeAnnotation.typeAnnotation.types
    for (let i = 0, l = unionType.length; i < l; ++i) {
      const type = unionType[i]
      if (types.isTSLiteralType(type) && types.isStringLiteral(type.literal)) {
        values.push(type.literal.value)
      }
    }

    if (values.length === unionType.length) {
      return values
    }
  }
}

const extractTypename = (type: TSTypeDeclaration): string | string[] => {
  let typenameProperty: types.TSPropertySignature | undefined
  if (types.isTSInterfaceDeclaration(type)) {
    typenameProperty = type.body.body.find(isTypenameProperty)
  } else {
    typenameProperty = (type.typeAnnotation as types.TSTypeLiteral).members.find(isTypenameProperty)
  }

  let typename: string | string[] | undefined
  if (!typenameProperty || !(typename = extractTypenameValue(typenameProperty.typeAnnotation))) {
    throw new Error(
      `Type ${type.id.name} should have a property ${GRAPHQL_OBJECT_PROPERTY} which has a const string value`
    )
  }

  return typename
}

const extractProperties = (type: TSTypeDeclaration): TypeProperties[] => {
  let rawProperties: types.TSTypeElement[] = []
  if (types.isTSInterfaceDeclaration(type)) {
    rawProperties = type.body.body
  } else {
    rawProperties = (type.typeAnnotation as types.TSTypeLiteral).members
  }

  const properties = rawProperties
    .filter(
      prop =>
        types.isTSPropertySignature(prop) &&
        types.isIdentifier(prop.key) &&
        prop.key.name !== '__typename' &&
        !!prop.typeAnnotation
    )
    .map(prop => {
      const name = ((prop as types.TSPropertySignature).key as types.Identifier).name
      const type = ((prop as types.TSPropertySignature).typeAnnotation as types.TSTypeAnnotation)
        .typeAnnotation

      return { name, type }
    })

  return properties
}

const transformToGraphQLTypeInfo = (type: TSTypeDeclaration): GraphQLTypeInfo => {
  const typename = extractTypename(type),
    name = type.id.name,
    properties = extractProperties(type)

  return { name, typename, properties }
}
