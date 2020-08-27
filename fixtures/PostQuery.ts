export type PostQuery_post_comments = {
  __typename: 'Comment'
  id: string
  content: string
}

export type PostQuery_post = {
  __typename: 'Post'
  id: string
  title: string
  content: string
  comments: PostQuery_post_comments[]
}

export type PostQuery = {
  post: PostQuery_post
}
