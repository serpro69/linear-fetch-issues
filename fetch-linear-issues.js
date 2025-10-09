#!/usr/bin/env node

/**
 * Simple script to fetch all user's issues from Linear and export to YAML
 *
 * Setup:
 * 1. Install dependencies: npm install
 * 2. Get your API key from: https://linear.app/settings/api
 * 3. Set the environment variable: export LINEAR_API_KEY=your_api_key_here
 * 4. Run: node fetch-linear-issues.js
 * 5. Output will be written to: linear-issues.yml in the current directory
 */

const { LinearClient } = require('@linear/sdk');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

async function fetchUserIssues() {
  // Check if API key is provided
  const apiKey = process.env.LINEAR_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: LINEAR_API_KEY environment variable is not set');
    console.error('Please set it with: export LINEAR_API_KEY=your_api_key_here');
    console.error('Get your API key from: https://linear.app/settings/api');
    process.exit(1);
  }

  try {
    // Initialize the Linear client
    const linearClient = new LinearClient({ apiKey });

    console.log('🔍 Fetching your Linear issues...\n');

    // Fetch the current user
    const me = await linearClient.viewer;
    console.log(`👤 User: ${me.name} (${me.email})\n`);

    // Fetch ALL issues assigned to the current user with pagination
    // Using orderBy to sort by most recently updated
    // includeArchived: true to include archived issues
    console.log('📥 Fetching issues (with pagination to get all issues)...\n');

    let allIssues = [];
    let hasNextPage = true;
    let afterCursor = null;
    let pageCount = 0;

    while (hasNextPage) {
      // Use raw GraphQL query to fetch all data at once (avoid lazy loading)
      const query = `
        query($userId: ID!, $first: Int!, $after: String, $includeArchived: Boolean!) {
          issues(
            filter: { assignee: { id: { eq: $userId } } }
            orderBy: updatedAt
            includeArchived: $includeArchived
            first: $first
            after: $after
          ) {
            nodes {
              id
              identifier
              title
              description
              url
              priority
              estimate
              dueDate
              createdAt
              updatedAt
              completedAt
              archivedAt
              state {
                name
              }
              team {
                name
              }
              project {
                name
              }
              cycle {
                name
              }
              assignee {
                name
              }
              labels {
                nodes {
                  name
                }
              }
              comments {
                nodes {
                  id
                  body
                  createdAt
                  resolvedAt
                  user {
                    name
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const variables = {
        userId: me.id,
        first: 100,
        after: afterCursor,
        includeArchived: true
      };

      const response = await linearClient._request(query, variables);
      const issuesData = response.issues;

      allIssues = allIssues.concat(issuesData.nodes);
      pageCount++;

      hasNextPage = issuesData.pageInfo.hasNextPage;
      afterCursor = issuesData.pageInfo.endCursor;

      console.log(`   Fetched page ${pageCount}: ${issuesData.nodes.length} issues (Total so far: ${allIssues.length})`);
    }

    const issueNodes = allIssues;
    console.log('');

    if (issueNodes.length === 0) {
      console.log('✨ No issues assigned to you!');
      return;
    }

    console.log(`📋 Found ${issueNodes.length} issue(s)\n`);
    console.log('🔄 Processing issues and building YAML output...\n');

    // Build YAML data structure
    const issuesData = [];

    // Helper function to trim empty lines from beginning/end of text
    const trimEmptyLines = (text) => {
      if (!text) return null;
      const lines = text.split('\n');

      // Remove empty lines from start
      while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
      }

      // Remove empty lines from end
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
      }

      return lines.length > 0 ? lines.join('\n') : null;
    };

    for (const issue of issueNodes) {
      // All data is already fetched, no more API calls needed!
      const labels = issue.labels?.nodes || [];
      const labelNames = labels.length > 0 ? labels.map(label => label.name) : null;

      const comments = issue.comments?.nodes || [];
      const commentsList = comments.length > 0
        ? comments.map(comment => ({
            id: comment.id || null,
            body: trimEmptyLines(comment.body),
            createdAt: comment.createdAt || null,
            resolvedAt: comment.resolvedAt || null,
            user: comment.user?.name || null
          }))
        : null;

      // Create issue object with all fields, using null for missing values
      const issueData = {
        id: issue.id || null,
        identifier: issue.identifier || null,
        title: issue.title || null,
        status: issue.state?.name || null,
        team: issue.team?.name || null,
        priority: issue.priority !== undefined ? issue.priority : null,
        description: trimEmptyLines(issue.description),
        labels: labelNames,
        url: issue.url || null,
        assignee: issue.assignee?.name || null,
        project: issue.project?.name || null,
        cycle: issue.cycle?.name || null,
        estimate: issue.estimate || null,
        dueDate: issue.dueDate || null,
        createdAt: issue.createdAt || null,
        updatedAt: issue.updatedAt || null,
        completedAt: issue.completedAt || null,
        archivedAt: issue.archivedAt || null,
        comments: commentsList
      };

      issuesData.push(issueData);
    }

    // Sort issues by identifier (ID) with natural number sorting
    // ENG-99 comes before ENG-123
    issuesData.sort((a, b) => {
      if (!a.identifier) return 1;
      if (!b.identifier) return -1;

      // Extract prefix and number from identifier (e.g., "ENG-123" -> ["ENG", 123])
      const parseIdentifier = (id) => {
        const match = id.match(/^([A-Za-z]+)-(\d+)$/);
        if (match) {
          return { prefix: match[1], number: parseInt(match[2], 10) };
        }
        return { prefix: id, number: 0 };
      };

      const parsedA = parseIdentifier(a.identifier);
      const parsedB = parseIdentifier(b.identifier);

      // First compare by prefix (team name)
      const prefixCompare = parsedA.prefix.localeCompare(parsedB.prefix);
      if (prefixCompare !== 0) return prefixCompare;

      // Then compare by number numerically
      return parsedA.number - parsedB.number;
    });

    console.log(`✅ Processed ${issuesData.length} issues\n`);

    // Convert to YAML
    const yamlOutput = yaml.dump(issuesData, {
      lineWidth: -1, // Don't wrap lines
      noRefs: true,  // Don't use anchors/references
      sortKeys: false // Keep our custom order
    });

    // Write to file
    const outputPath = path.join(process.cwd(), 'linear-issues.yml');
    fs.writeFileSync(outputPath, yamlOutput, 'utf8');

    console.log(`💾 Output written to: ${outputPath}`);
    console.log(`📊 Total issues exported: ${issuesData.length}`);

  } catch (error) {
    console.error('❌ Error fetching issues:', error.message);
    process.exit(1);
  }
}

// Run the script
fetchUserIssues();
