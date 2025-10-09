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
      const issues = await linearClient.issues({
        filter: {
          assignee: { id: { eq: me.id } }
        },
        orderBy: 'updatedAt',
        includeArchived: true,
        first: 100, // Fetch 100 issues per page for efficiency
        after: afterCursor
      });

      allIssues = allIssues.concat(issues.nodes);
      pageCount++;

      hasNextPage = issues.pageInfo.hasNextPage;
      afterCursor = issues.pageInfo.endCursor;

      console.log(`   Fetched page ${pageCount}: ${issues.nodes.length} issues (Total so far: ${allIssues.length})`);
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

    for (const issue of issueNodes) {
      const state = await issue.state;
      const team = await issue.team;
      const project = await issue.project;
      const cycle = await issue.cycle;
      const assignee = await issue.assignee;

      // Create issue object with all fields, using null for missing values
      const issueData = {
        id: issue.id || null,
        identifier: issue.identifier || null,
        title: issue.title || null,
        status: state?.name || null,
        team: team?.name || null,
        priority: issue.priority !== undefined ? issue.priority : null,
        description: issue.description || null,
        url: issue.url || null,
        assignee: assignee?.name || null,
        project: project?.name || null,
        cycle: cycle?.name || null,
        estimate: issue.estimate || null,
        dueDate: issue.dueDate || null,
        createdAt: issue.createdAt || null,
        updatedAt: issue.updatedAt || null,
        completedAt: issue.completedAt || null,
        archivedAt: issue.archivedAt || null
      };

      issuesData.push(issueData);
    }

    // Sort issues by identifier (ID)
    issuesData.sort((a, b) => {
      if (!a.identifier) return 1;
      if (!b.identifier) return -1;
      return a.identifier.localeCompare(b.identifier);
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
