import gql from "graphql-tag";

export const typeDefs = gql`
  enum ReleaseStatus {
    planned
    ongoing
    done
  }

  type ChecklistStep {
    id: ID!
    label: String!
    completed: Boolean!
  }

  type ChecklistStepDefinition {
    id: ID!
    label: String!
  }

  type Release {
    id: ID!
    name: String!
    date: String!
    status: ReleaseStatus!
    additionalInfo: String
    completedSteps: [String!]!
    checklist: [ChecklistStep!]!
    createdAt: String!
    updatedAt: String!
  }

  input CreateReleaseInput {
    name: String!
    date: String!
    additionalInfo: String
    completedSteps: [String!]
  }

  input UpdateReleaseInput {
    name: String
    date: String
    additionalInfo: String
    completedSteps: [String!]
  }

  type Query {
    releases: [Release!]!
    release(id: ID!): Release
    predefinedSteps: [ChecklistStepDefinition!]!
  }

  type Mutation {
    createRelease(input: CreateReleaseInput!): Release!
    updateRelease(id: ID!, input: UpdateReleaseInput!): Release!
    toggleReleaseStep(id: ID!, stepId: String!, completed: Boolean!): Release!
    deleteRelease(id: ID!): Boolean!
  }
`;
