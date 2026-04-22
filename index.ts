import * as core from '@actions/core';
import { isRelevant, parseFilenames } from './matcher';
import type { Config } from './types';

function parseConfig(raw: string): Config {
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('config must be a JSON object');
    }
    return parsed as Config;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`config input is not valid JSON: ${msg}`);
  }
}

async function run(): Promise<void> {
  try {
    const rawConfig = core.getInput('config', { required: true });
    const rawFilenames = core.getInput('filenames', { required: true });

    const config = parseConfig(rawConfig);
    const changedFiles = parseFilenames(rawFilenames);

    core.startGroup(`Changed files (${changedFiles.length})`);
    for (const f of changedFiles) core.info(f);
    core.endGroup();

    const relevantStrMap: Record<string, 'yes' | 'no'> = {};
    const relevantBoolMap: Record<string, boolean> = {};
    const jobsToRun: string[] = [];

    core.startGroup('Relevance decisions');
    for (const [jobName, jobConfig] of Object.entries(config)) {
      const { relevant, trigger } = isRelevant(jobConfig, changedFiles);
      relevantStrMap[jobName] = relevant ? 'yes' : 'no';
      relevantBoolMap[jobName] = relevant;
      if (relevant) {
        jobsToRun.push(jobName);
        core.info(`✅ ${jobName}  (triggered by: ${trigger})`);
      } else {
        core.info(`⏭️  ${jobName}  (no matching files)`);
      }
    }
    core.endGroup();

    // Matches the is-relevant-action@v4 contract: `relevant` is a JSON object of yes/no strings.
    core.setOutput('relevant', JSON.stringify(relevantStrMap));
    core.setOutput('relevant-bool', JSON.stringify(relevantBoolMap));
    core.setOutput('jobs-to-run', JSON.stringify(jobsToRun));

    try {
      await core.summary
        .addHeading('Is Relevant')
        .addTable([
          [
            { data: 'Job', header: true },
            { data: 'Relevant?', header: true },
          ],
          ...Object.entries(relevantStrMap).map(([name, v]) => [
            name,
            v === 'yes' ? '✅ yes' : '⏭️ no',
          ]),
        ])
        .addRaw(`\n**Changed files:** ${changedFiles.length}`)
        .write();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      core.warning(`Failed to write summary: ${msg}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    core.setFailed(msg);
  }
}

void run();
