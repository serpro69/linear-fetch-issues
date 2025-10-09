# Linear Issues Fetcher

A simple Node.js script to fetch all issues assigned to you from Linear and export them to a YAML file.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Get your Linear API key:**
   - Go to https://linear.app/settings/api
   - Create a new Personal API Key
   - Copy the key

3. **Set the API key as an environment variable:**
   ```bash
   export LINEAR_API_KEY=your_api_key_here
   ```

## Usage

Run the script:
```bash
npm start
```

Or directly:
```bash
node fetch-linear-issues.js
```

## Features

- Fetches **ALL** issues assigned to you using pagination (no 50-issue limit!)
- Includes archived issues
- Exports to YAML file (`linear-issues.yml`) in the current directory
- Issues sorted by identifier (ID) in the output file
- Comprehensive issue data including:
  - ID and identifier
  - Title and description
  - Status (workflow state)
  - Team, project, and cycle
  - Priority
  - Assignee
  - Estimate and due date
  - Created, updated, completed, and archived timestamps
  - Direct URL to the issue
- Missing field values are explicitly set to `null` in YAML output

## Output

The script exports all issues to a YAML file named `linear-issues.yml` in the current directory. Issues are sorted by their identifier (e.g., ENG-100, ENG-101, etc.).

## Example Console Output

```
🔍 Fetching your Linear issues...

👤 User: John Doe (john@example.com)

📥 Fetching issues (with pagination to get all issues)...

   Fetched page 1: 100 issues (Total so far: 100)
   Fetched page 2: 50 issues (Total so far: 150)

📋 Found 150 issue(s)

🔄 Processing issues and building YAML output...

✅ Processed 150 issues

💾 Output written to: /path/to/current/directory/linear-issues.yml
📊 Total issues exported: 150
```

## Example YAML Output (linear-issues.yml)

```yaml
- id: abc123-def456-ghi789
  identifier: ENG-100
  title: Old feature request
  status: Done
  team: Engineering
  priority: 1
  description: This feature was completed and archived for historical reference.
  url: https://linear.app/team/issue/ENG-100
  assignee: John Doe
  project: null
  cycle: null
  estimate: null
  dueDate: null
  createdAt: '2025-08-15T10:00:00.000Z'
  updatedAt: '2025-09-20T10:30:00.000Z'
  completedAt: '2025-09-20T10:30:00.000Z'
  archivedAt: '2025-09-20T10:30:00.000Z'
- id: jkl012-mno345-pqr678
  identifier: ENG-123
  title: Fix login bug
  status: In Progress
  team: Engineering
  priority: 3
  description: Users are experiencing issues when logging in with SSO. The authentication flow hangs after redirecting from the identity provider.
  url: https://linear.app/team/issue/ENG-123
  assignee: John Doe
  project: Authentication Improvements
  cycle: Sprint 42
  estimate: 5
  dueDate: '2025-10-15'
  createdAt: '2025-10-01T08:00:00.000Z'
  updatedAt: '2025-10-09T14:30:00.000Z'
  completedAt: null
  archivedAt: null
- id: stu901-vwx234-yz567
  identifier: ENG-124
  title: Add dark mode
  status: Todo
  team: Engineering
  priority: 2
  description: Implement a dark mode theme for better user experience in low-light environments.
  url: https://linear.app/team/issue/ENG-124
  assignee: John Doe
  project: UI Enhancements
  cycle: null
  estimate: null
  dueDate: null
  createdAt: '2025-10-05T12:00:00.000Z'
  updatedAt: '2025-10-08T16:45:00.000Z'
  completedAt: null
  archivedAt: null
```

## Pagination

The script automatically handles pagination to fetch **all** your issues, not just the first 50. It:
- Fetches 100 issues per page for efficiency
- Shows progress as it fetches each page
- Continues until all issues are retrieved
- Works seamlessly even if you have hundreds or thousands of issues

## Priority Levels

- 0: None
- 1: Low
- 2: Medium
- 3: High
- 4: Urgent
