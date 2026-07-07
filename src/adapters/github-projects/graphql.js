export const PROJECT_QUERY = `
  query SkiStackProject($organization: String!, $projectNumber: Int!, $itemsFirst: Int!, $after: String) {
    organization(login: $organization) {
      projectV2(number: $projectNumber) {
        id
        fields(first: 100) {
          nodes {
            __typename
            ... on ProjectV2Field {
              id
              name
              dataType
            }
            ... on ProjectV2SingleSelectField {
              id
              name
              dataType
              options {
                id
                name
              }
            }
          }
        }
        items(first: $itemsFirst, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            isArchived
            content {
              __typename
              ... on DraftIssue {
                id
                title
                body
              }
              ... on Issue {
                id
                title
                body
                url
                number
                repository {
                  nameWithOwner
                }
              }
              ... on PullRequest {
                id
                title
                body
                url
                number
                repository {
                  nameWithOwner
                }
              }
            }
            fieldValues(first: 100) {
              nodes {
                __typename
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  optionId
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldTextValue {
                  text
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldDateValue {
                  date
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
                ... on ProjectV2ItemFieldNumberValue {
                  number
                  field {
                    ... on ProjectV2FieldCommon {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const UPDATE_FIELD_MUTATION = `
  mutation SkiStackUpdateProjectField($input: UpdateProjectV2ItemFieldValueInput!) {
    updateProjectV2ItemFieldValue(input: $input) {
      projectV2Item {
        id
      }
    }
  }
`;

export const CLEAR_FIELD_MUTATION = `
  mutation SkiStackClearProjectField($input: ClearProjectV2ItemFieldValueInput!) {
    clearProjectV2ItemFieldValue(input: $input) {
      projectV2Item {
        id
      }
    }
  }
`;

export const ADD_COMMENT_MUTATION = `
  mutation SkiStackAddComment($input: AddCommentInput!) {
    addComment(input: $input) {
      commentEdge {
        node {
          id
          url
        }
      }
    }
  }
`;

