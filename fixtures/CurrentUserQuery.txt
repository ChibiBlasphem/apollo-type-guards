export interface CurrentUserQuery_currentUser {
  __typename: 'User'
  id: string
  firstname: string
  lastname: string
}

export interface CurrentUserQuery {
  currentUser: CurrentUserQuery_currentUser
}
