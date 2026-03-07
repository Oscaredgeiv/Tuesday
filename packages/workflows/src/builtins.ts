import type { WorkflowDefinition } from '@tuesday/shared';

export const BUILTIN_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'morning-setup',
    name: 'Morning Setup',
    description: 'Open Orbit, Gmail, and Slack to start the day',
    triggerPhrase: 'run my morning setup',
    steps: [
      {
        id: 'open-orbit',
        toolName: 'open_url',
        input: { url: '{{orbitUrl}}' },
        description: 'Open Orbit',
      },
      {
        id: 'open-gmail',
        toolName: 'open_url',
        input: { url: 'https://mail.google.com' },
        description: 'Open Gmail',
      },
      {
        id: 'open-slack',
        toolName: 'open_app',
        input: { appName: 'Slack' },
        description: 'Open Slack',
      },
    ],
    variables: {
      orbitUrl: 'http://localhost:3000',
    },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
