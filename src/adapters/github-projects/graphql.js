const PROJECT_SELECTION = `
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
            color
            description
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
            state
            stateReason
            repository {
              nameWithOwner
            }
            blockedBy(first: 100) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                id
                title
                url
                number
                state
                stateReason
                repository {
                  nameWithOwner
                }
              }
            }
          }
          ... on PullRequest {
            id
            title
            body
            url
            number
            baseRefName
            baseRefOid
            headRefName
            headRefOid
            headRepository {
              nameWithOwner
            }
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
`;

export const ORGANIZATION_PROJECT_QUERY = `
  query SkiStackOrganizationProject($owner: String!, $projectNumber: Int!, $itemsFirst: Int!, $after: String) {
    organization(login: $owner) {
      ${PROJECT_SELECTION}
    }
  }
`;

export const USER_PROJECT_QUERY = `
  query SkiStackUserProject($owner: String!, $projectNumber: Int!, $itemsFirst: Int!, $after: String) {
    user(login: $owner) {
      ${PROJECT_SELECTION}
    }
  }
`;

export const ISSUE_BLOCKED_BY_QUERY = `
  query SkiStackIssueBlockedBy($id: ID!, $first: Int!, $after: String) {
    node(id: $id) {
      ... on Issue {
        blockedBy(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            url
            number
            state
            stateReason
            repository {
              nameWithOwner
            }
          }
        }
      }
    }
  }
`;

export const RESOLVE_PROJECT_OWNER_QUERY = `
  query SkiStackResolveProjectOwner($owner: String!) {
    organization(login: $owner) {
      id
      login
      __typename
    }
    user(login: $owner) {
      id
      login
      __typename
    }
  }
`;

export const VIEWER_QUERY = `
  query SkiStackViewer {
    viewer {
      id
      login
      __typename
    }
  }
`;

export const CREATE_PROJECT_MUTATION = `
  mutation SkiStackCreateProject($input: CreateProjectV2Input!) {
    createProjectV2(input: $input) {
      projectV2 {
        id
        number
        title
        url
      }
    }
  }
`;

export const COPY_PROJECT_MUTATION = `
  mutation SkiStackCopyProject($input: CopyProjectV2Input!) {
    copyProjectV2(input: $input) {
      projectV2 {
        id
        number
        title
        url
      }
    }
  }
`;

export const RESOLVE_REPOSITORY_QUERY = `
  query SkiStackResolveRepository($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      id
      name
      nameWithOwner
      url
      owner {
        login
      }
    }
  }
`;

export const REPOSITORY_OPEN_ITEMS_QUERY = `
  query SkiStackRepositoryOpenItems($owner: String!, $name: String!, $first: Int!) {
    repository(owner: $owner, name: $name) {
      issues(first: $first, states: OPEN, orderBy: { field: CREATED_AT, direction: ASC }) {
        nodes {
          id
          title
          number
          url
        }
      }
      pullRequests(first: $first, states: OPEN, orderBy: { field: CREATED_AT, direction: ASC }) {
        nodes {
          id
          title
          number
          url
        }
      }
    }
  }
`;

export const ADD_PROJECT_ITEM_MUTATION = `
  mutation SkiStackAddProjectItem($input: AddProjectV2ItemByIdInput!) {
    addProjectV2ItemById(input: $input) {
      item {
        id
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

export const CREATE_PROJECT_FIELD_MUTATION = `
  mutation SkiStackCreateProjectField($input: CreateProjectV2FieldInput!) {
    createProjectV2Field(input: $input) {
      projectV2Field {
        ... on ProjectV2FieldCommon {
          id
          name
          dataType
        }
      }
    }
  }
`;

export const UPDATE_PROJECT_FIELD_MUTATION = `
  mutation SkiStackUpdateProjectField($input: UpdateProjectV2FieldInput!) {
    updateProjectV2Field(input: $input) {
      projectV2Field {
        ... on ProjectV2FieldCommon {
          id
          name
          dataType
        }
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
